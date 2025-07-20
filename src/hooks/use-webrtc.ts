
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { User } from '@/lib/data';
import { collection, doc, addDoc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, getDocs, writeBatch, query, where, Timestamp } from 'firebase/firestore';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// This type helps pass room permissions from the main hook
type RoomPermissions = {
    isPublic: boolean;
    editorIds: string[];
} | null;

export function useWebRTC(roomId: string, currentUser: User | null, roomData: RoomPermissions) {
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodesRef = useRef<Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>>(new Map());
  const isJoiningRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!audioContextRef.current) {
        try {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        } catch (e) {
            console.error("AudioContext is not supported.", e);
        }
    }
    const audioContext = audioContextRef.current;

    const interval = setInterval(() => {
      if (!isVoiceConnected || !audioContext || audioContext.state === 'closed') {
        if(speakingPeers.size > 0) setSpeakingPeers(new Set());
        return;
      };
      const currentlySpeaking = new Set<string>();
      analyserNodesRef.current.forEach((nodes, userId) => {
        const dataArray = new Uint8Array(nodes.analyser.frequencyBinCount);
        nodes.analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        if (average > 20) {
          currentlySpeaking.add(userId);
        }
      });

      if (currentlySpeaking.size !== speakingPeers.size || ![...currentlySpeaking].every(id => speakingPeers.has(id))) {
        setSpeakingPeers(currentlySpeaking);
      }
    }, 200);

    return () => {
      clearInterval(interval);
      if(audioContext && audioContext.state !== 'closed') {
         audioContext.close().catch(console.error);
         audioContextRef.current = null;
      }
    };
  }, [isVoiceConnected, speakingPeers]);


   useEffect(() => {
    remoteStreams.forEach((stream, userId) => {
        if (!analyserNodesRef.current.has(userId) && audioContextRef.current && audioContextRef.current.state !== 'closed') {
            try {
                const source = audioContextRef.current.createMediaStreamSource(stream);
                const analyser = audioContextRef.current.createAnalyser();
                analyser.fftSize = 512;
                source.connect(analyser);
                analyserNodesRef.current.set(userId, { source, analyser });
            } catch(e) {
                console.error("Error creating audio analyser:", e);
            }
        }
    });
    analyserNodesRef.current.forEach((nodes, userId) => {
        if (!remoteStreams.has(userId)) {
            nodes.source.disconnect();
            analyserNodesRef.current.delete(userId);
        }
    });
  }, [remoteStreams]);


  const addTracksToAllPeerConnections = useCallback(() => {
    if (!localStreamRef.current) return;
    for (const pc of peerConnectionsRef.current.values()) {
        localStreamRef.current.getTracks().forEach(track => {
            if (!pc.getSenders().find(sender => sender.track === track)) {
                pc.addTrack(track, localStreamRef.current!);
            }
        });
    }
  }, []);

  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    if (peerConnectionsRef.current.has(peerId)) {
      return peerConnectionsRef.current.get(peerId)!;
    }

    const pc = new RTCPeerConnection(servers);
    
    // **FIX**: Add tracks from the existing local stream when a new peer connection is created.
    // This handles cases where new peers join after the current user is already broadcasting.
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
        });
    }

    pc.ontrack = (event) => {
        setRemoteStreams(prev => new Map(prev).set(peerId, event.streams[0]));
    };

    if (currentUser) {
        const myId = currentUser.uid;
        
        const myIceCandidatesRef = collection(db, 'studyRooms', roomId, 'peers', myId, 'connections', peerId, 'iceCandidates');
        const remoteIceCandidatesRef = collection(db, 'studyRooms', roomId, 'peers', peerId, 'connections', myId, 'iceCandidates');

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                addDoc(remoteIceCandidatesRef, event.candidate.toJSON()).catch(e => console.error("Failed to add ICE candidate:", e));
            }
        };
        
        onSnapshot(myIceCandidatesRef, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    if (pc.signalingState !== 'closed') {
                        const candidate = new RTCIceCandidate(change.doc.data());
                        pc.addIceCandidate(candidate).catch(e => console.error("Error adding ICE candidate:", e));
                    }
                }
            });
        });
    }

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [currentUser, roomId]);


  const joinVoiceChannel = useCallback(async () => {
    if (!currentUser || isJoiningRef.current || isVoiceConnected) return;
    isJoiningRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach(track => track.enabled = !isMuted);

      // **FIX**: After getting the stream, ensure all existing peer connections get the tracks.
      // This handles the case where connections were created before the stream was available.
      addTracksToAllPeerConnections();
      
      const myPeerRef = doc(db, 'studyRooms', roomId, 'peers', currentUser.uid);
      await setDoc(myPeerRef, { uid: currentUser.uid, name: currentUser.name || "Anonymous", joinedAt: Timestamp.now() });

      setIsVoiceConnected(true);
    } catch (error) {
      console.error("Error accessing microphone or joining voice:", error);
    } finally {
        isJoiningRef.current = false;
    }
  }, [currentUser, isVoiceConnected, isMuted, roomId, addTracksToAllPeerConnections]);

  useEffect(() => {
    if (!isVoiceConnected || !currentUser || !roomData) return;
    
    const myId = currentUser.uid;
    const peersRef = collection(db, 'studyRooms', roomId, 'peers');

    const unsubscribePeers = onSnapshot(peersRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            const peerId = change.doc.id;
            if (peerId === myId) return;

            if (change.type === 'added') {
                const pc = createPeerConnection(peerId);
                const offerDescription = await pc.createOffer();
                await pc.setLocalDescription(offerDescription);

                const offer = { sdp: offerDescription.sdp, type: offerDescription.type };
                await setDoc(doc(db, 'studyRooms', roomId, 'peers', peerId, 'connections', myId), { offer });
            }

            if (change.type === 'removed') {
                peerConnectionsRef.current.get(peerId)?.close();
                peerConnectionsRef.current.delete(peerId);
                setRemoteStreams(prev => {
                    const newStreams = new Map(prev);
                    newStreams.delete(peerId);
                    return newStreams;
                });
            }
        });
    });

    const myConnectionsRef = collection(db, 'studyRooms', roomId, 'peers', myId, 'connections');
    const unsubscribeConnections = onSnapshot(myConnectionsRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            const peerId = change.doc.id;
            const data = change.doc.data();
            const pc = peerConnectionsRef.current.get(peerId) || createPeerConnection(peerId);

            if (data.offer && pc.signalingState !== 'stable') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answerDescription = await pc.createAnswer();
                await pc.setLocalDescription(answerDescription);
                const answer = { type: answerDescription.type, sdp: answerDescription.sdp };
                await updateDoc(change.doc.ref, { answer });
            }

            if (data.answer && pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        });
    });

    return () => {
        unsubscribePeers();
        unsubscribeConnections();
    };

  }, [isVoiceConnected, currentUser, roomId, createPeerConnection, roomData]);


  const leaveVoiceChannel = useCallback(async () => {
    if (!currentUser) return;

    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    setRemoteStreams(new Map());

    const myId = currentUser.uid;
    const myPeerRef = doc(db, 'studyRooms', roomId, 'peers', myId);

    try {
        const batch = writeBatch(db);
        const myConnectionsRef = collection(myPeerRef, 'connections');
        const myConnectionsSnap = await getDocs(myConnectionsRef);
        for (const connDoc of myConnectionsSnap.docs) {
            const iceCandidatesRef = collection(connDoc.ref, 'iceCandidates');
            const iceCandidatesSnap = await getDocs(iceCandidatesRef);
            iceCandidatesSnap.forEach(iceDoc => batch.delete(iceDoc.ref));
            batch.delete(connDoc.ref);
        }

        const q = query(collection(db, 'studyRooms', roomId, 'peers'));
        const peersSnapshot = await getDocs(q);
        for (const peerDoc of peersSnapshot.docs) {
            if (peerDoc.id !== myId) {
                const connToMeRef = doc(peerDoc.ref, 'connections', myId);
                const iceCandidatesToMeRef = collection(connToMeRef, 'iceCandidates');
                const iceToMeSnap = await getDocs(iceCandidatesToMeRef);
                iceToMeSnap.forEach(iceDoc => batch.delete(iceDoc.ref));
                batch.delete(connToMeRef);
            }
        }
        
        batch.delete(myPeerRef);
        await batch.commit();

    } catch(e) {
        console.warn("Batch cleanup failed, trying simple delete.", e);
        try {
            await deleteDoc(myPeerRef);
        } catch (delErr) {
            console.error("Simple delete also failed:", delErr);
        }
    }
    
    setIsVoiceConnected(false);
  }, [currentUser, roomId]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
        const newMutedState = !isMuted;
        localStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = !newMutedState;
        });
        setIsMuted(newMutedState);
    }
  }, [isMuted]);

  return {
    isVoiceConnected,
    isMuted,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    remoteStreams,
    speakingPeers,
  };
}

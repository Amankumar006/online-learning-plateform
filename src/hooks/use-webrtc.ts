
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { User } from '@/lib/data';
import { collection, doc, addDoc, onSnapshot, setDoc, getDoc, updateDoc, deleteDoc, query, getDocs } from 'firebase/firestore';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC(roomId: string, currentUser: User | null) {
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodesRef = useRef<Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>>(new Map());
  const isJoiningRef = useRef(false);

  // --- Audio Analysis for Speaking Indicators ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;

    const interval = setInterval(() => {
      if (!isVoiceConnected || audioContext.state === 'closed') {
        if(speakingPeers.size > 0) setSpeakingPeers(new Set());
        return;
      };
      const currentlySpeaking = new Set<string>();
      analyserNodesRef.current.forEach((nodes, userId) => {
        const dataArray = new Uint8Array(nodes.analyser.frequencyBinCount);
        nodes.analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        if (average > 20) { // Threshold for speaking
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


  // --- Core Connection Logic ---
  const createPeerConnection = useCallback((peerId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(servers);
    
    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.ontrack = (event) => {
        setRemoteStreams(prev => {
            const newStreams = new Map(prev);
            newStreams.set(peerId, event.streams[0]);
            return newStreams;
        });
    };
    
    if(currentUser) {
        const myId = currentUser.uid;
        const myIceCandidatesCollection = collection(db, 'studyRooms', roomId, 'peers', myId, 'connections', peerId, 'iceCandidates');
        const peerIceCandidatesCollection = collection(db, 'studyRooms', roomId, 'peers', peerId, 'connections', myId, 'iceCandidates');
        
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                addDoc(myIceCandidatesCollection, event.candidate.toJSON());
            }
        };

        onSnapshot(peerIceCandidatesCollection, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    pc.addIceCandidate(candidate).catch(e => console.error("Error adding ICE candidate:", e));
                }
            });
        });
    }

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [currentUser, roomId]);


  const joinVoiceChannel = useCallback(async (allParticipants: User[]) => {
    if (!currentUser || isJoiningRef.current) return;
    isJoiningRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach(track => track.enabled = !isMuted);
      
      const myPeerRef = doc(db, 'studyRooms', roomId, 'peers', currentUser.uid);
      await setDoc(myPeerRef, { uid: currentUser.uid, name: currentUser.name || "Anonymous" });

      const otherParticipants = allParticipants.filter(p => p.uid !== currentUser.uid);

      for (const peer of otherParticipants) {
          const pc = createPeerConnection(peer.uid);
          const offerDescription = await pc.createOffer();
          await pc.setLocalDescription(offerDescription);
          const offer = { sdp: offerDescription.sdp, type: offerDescription.type };
          const offerRef = doc(db, 'studyRooms', roomId, 'peers', peer.uid, 'connections', currentUser.uid);
          await setDoc(offerRef, { offer });
      }

      setIsVoiceConnected(true);
    } catch (error) {
      console.error("Error accessing microphone or joining voice:", error);
    } finally {
        isJoiningRef.current = false;
    }
  }, [currentUser, createPeerConnection, isMuted, roomId]);


  useEffect(() => {
    if (!isVoiceConnected || !currentUser) return;
    
    const myConnectionsRef = collection(db, 'studyRooms', roomId, 'peers', currentUser.uid, 'connections');
    const unsubscribe = onSnapshot(myConnectionsRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            const peerId = change.doc.id;
            const data = change.doc.data();

            if (data.offer && !peerConnectionsRef.current.has(peerId)) {
                const pc = createPeerConnection(peerId);
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answerDescription = await pc.createAnswer();
                await pc.setLocalDescription(answerDescription);
                const answer = { type: answerDescription.type, sdp: answerDescription.sdp };
                await updateDoc(change.doc.ref, { answer });
            }

            if (data.answer) {
                const pc = peerConnectionsRef.current.get(peerId);
                if (pc && pc.signalingState !== 'stable') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                }
            }
        });
    });

    return () => unsubscribe();
  }, [isVoiceConnected, currentUser, roomId, createPeerConnection]);
  

  const leaveVoiceChannel = useCallback(async () => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;

    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    setRemoteStreams(new Map());

    if (currentUser) {
        const myPeerRef = doc(db, 'studyRooms', roomId, 'peers', currentUser.uid);
        try {
            const connectionsSnapshot = await getDocs(collection(myPeerRef, 'connections'));
            await Promise.all(connectionsSnapshot.docs.map(doc => deleteDoc(doc.ref)));
            await deleteDoc(myPeerRef);
        } catch(e) {
            console.warn("Could not clean up peer docs, they may already be deleted.", e);
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

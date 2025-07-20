
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { User } from '@/lib/data';
import { collection, doc, addDoc, onSnapshot, setDoc, getDoc, updateDoc, deleteDoc, query, getDocs, Timestamp } from 'firebase/firestore';

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
    // If a connection already exists, close it before creating a new one.
    if (peerConnectionsRef.current.has(peerId)) {
        peerConnectionsRef.current.get(peerId)?.close();
    }
    
    const pc = new RTCPeerConnection(servers);
    
    localStreamRef.current?.getTracks().forEach(track => {
      if (localStreamRef.current) {
        pc.addTrack(track, localStreamRef.current);
      }
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
        // Path to where I will send my ICE candidates for the peer to see
        const myIceCandidatesCollection = collection(db, 'studyRooms', roomId, 'peers', myId, 'iceCandidates', peerId);
        // Path to where the peer will send their ICE candidates for me to see
        const peerIceCandidatesCollection = collection(db, 'studyRooms', roomId, 'peers', peerId, 'iceCandidates', myId);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                addDoc(myIceCandidatesCollection, event.candidate.toJSON()).catch(e => console.error("Failed to add ICE candidate:", e));
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


  const joinVoiceChannel = useCallback(async () => {
    if (!currentUser || isJoiningRef.current || isVoiceConnected) return;
    isJoiningRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach(track => track.enabled = !isMuted);
      
      const myPeerRef = doc(db, 'studyRooms', roomId, 'peers', currentUser.uid);
      await setDoc(myPeerRef, { uid: currentUser.uid, name: currentUser.name || "Anonymous", joinedAt: Timestamp.now() });

      setIsVoiceConnected(true);
    } catch (error) {
      console.error("Error accessing microphone or joining voice:", error);
    } finally {
        isJoiningRef.current = false;
    }
  }, [currentUser, isVoiceConnected, isMuted, roomId]);

  // Main listener for peer discovery and signaling
  useEffect(() => {
    if (!isVoiceConnected || !currentUser) return;
    
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

            if (data.answer && pc.signalingState !== 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        });
    });

    return () => {
        unsubscribePeers();
        unsubscribeConnections();
    };

  }, [isVoiceConnected, currentUser, roomId, createPeerConnection]);


  const leaveVoiceChannel = useCallback(async () => {
    if (!currentUser) return;

    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;
    
    // Close all peer connections
    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    setRemoteStreams(new Map());

    const myPeerRef = doc(db, 'studyRooms', roomId, 'peers', currentUser.uid);
    try {
        // Delete my own peer document, which will trigger 'removed' for others
        await deleteDoc(myPeerRef);
        
        // Clean up connections where I was the callee
        const myConnectionsSnapshot = await getDocs(collection(myPeerRef, 'connections'));
        await Promise.all(myConnectionsSnapshot.docs.map(doc => deleteDoc(doc.ref)));

        // Clean up ICE candidates I sent
        const myIceCandidatesFolder = await getDocs(collection(myPeerRef, 'iceCandidates'));
        await Promise.all(myIceCandidatesFolder.docs.map(async (folderDoc) => {
            const subCollection = collection(myPeerRef, 'iceCandidates', folderDoc.id);
            const candidates = await getDocs(subCollection);
            await Promise.all(candidates.docs.map(cDoc => deleteDoc(cDoc.ref)));
            await deleteDoc(folderDoc.ref);
        }));

        // Clean up connections where I was the caller
        const otherPeersSnapshot = await getDocs(query(collection(db, 'studyRooms', roomId, 'peers')));
        await Promise.all(otherPeersSnapshot.docs.map(async (peerDoc) => {
            if (peerDoc.id !== currentUser.uid) {
                const connRef = doc(db, 'studyRooms', roomId, 'peers', peerDoc.id, 'connections', currentUser.uid);
                await deleteDoc(connRef).catch(() => {});
                
                const iceCandidateFolderRef = collection(db, 'studyRooms', roomId, 'peers', peerDoc.id, 'iceCandidates', currentUser.uid);
                const iceCandidatesSnapshot = await getDocs(iceCandidateFolderRef);
                await Promise.all(iceCandidatesSnapshot.docs.map(doc => deleteDoc(doc.ref)));
            }
        }));

    } catch(e) {
        console.warn("Could not clean up all peer docs, some may already be deleted.", e);
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

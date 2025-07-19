
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { User } from '@/lib/data';
import { collection, doc, addDoc, onSnapshot, setDoc, getDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC(roomId: string, currentUser: User | null, allParticipants: User[]) {
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  const addRemoteStream = useCallback((userId: string, stream: MediaStream) => {
    setRemoteStreams(prev => new Map(prev).set(userId, stream));
  }, []);

  const removeRemoteStream = useCallback((userId: string) => {
    setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
    });
  }, []);


  const createPeerConnection = useCallback((peerId: string) => {
    if (!currentUser) return;
    
    const pc = new RTCPeerConnection(servers);
    
    // Add local tracks to the connection
    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });
    
    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      addRemoteStream(peerId, event.streams[0]);
    };

    // Handle ICE candidates
    const myId = currentUser.uid;
    const peerRef = doc(db, 'studyRooms', roomId, 'peers', peerId);
    const myIceCandidatesCollection = collection(peerRef, 'connections', myId, 'iceCandidates');
    const peerIceCandidatesCollection = collection(doc(db, 'studyRooms', roomId, 'peers', myId), 'connections', peerId, 'iceCandidates');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(myIceCandidatesCollection, event.candidate.toJSON());
      }
    };
    
    // Listen for ICE candidates from the peer
    onSnapshot(peerIceCandidatesCollection, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const candidate = new RTCIceCandidate(change.doc.data());
                pc.addIceCandidate(candidate);
            }
        });
    });

    peerConnectionsRef.current.set(peerId, pc);
    return pc;
  }, [currentUser, roomId, addRemoteStream]);

  const joinVoiceChannel = useCallback(async () => {
    if (!currentUser) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach(track => track.enabled = !isMuted);
      setIsVoiceConnected(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }, [currentUser, isMuted]);


  // Effect to handle setting up connections when we join or participants change
  useEffect(() => {
    if (!isVoiceConnected || !currentUser) return;

    const otherParticipants = allParticipants.filter(p => p.uid !== currentUser.uid);

    otherParticipants.forEach(peer => {
      if (!peerConnectionsRef.current.has(peer.uid)) {
        const pc = createPeerConnection(peer.uid);
        if (pc) {
          // Create offer
          pc.createOffer().then(offer => {
            pc.setLocalDescription(offer);
            const offerDoc = doc(db, 'studyRooms', roomId, 'peers', currentUser.uid, 'connections', peer.uid);
            setDoc(offerDoc, { offer });
          });
        }
      }
    });

    // Clean up connections for participants who left
    peerConnectionsRef.current.forEach((_, peerId) => {
      if (!otherParticipants.some(p => p.uid === peerId)) {
        peerConnectionsRef.current.get(peerId)?.close();
        peerConnectionsRef.current.delete(peerId);
        removeRemoteStream(peerId);
      }
    });

  }, [isVoiceConnected, allParticipants, currentUser, createPeerConnection, roomId, removeRemoteStream]);


  // Effect to listen for offers from other peers
  useEffect(() => {
    if (!isVoiceConnected || !currentUser) return;
    
    const connectionsRef = collection(db, 'studyRooms', roomId, 'peers', currentUser.uid, 'connections');
    const unsubscribe = onSnapshot(connectionsRef, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added' || change.type === 'modified') {
                const data = change.doc.data();
                if (data.offer) {
                    const peerId = change.doc.id;
                    if (!peerConnectionsRef.current.has(peerId)) {
                        const pc = createPeerConnection(peerId);
                        if (pc) {
                            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            await updateDoc(change.doc.ref, { answer });
                        }
                    }
                }
            }
        });
    });
    
    return unsubscribe;
  }, [isVoiceConnected, currentUser, roomId, createPeerConnection]);
  
  // Effect to listen for answers
  useEffect(() => {
    if (!isVoiceConnected || !currentUser) return;

    const connectionsQuery = query(collection(db, 'studyRooms', roomId, 'peers'), where('__name__', '!=', currentUser.uid));
    const unsubscribes = new Map<string, () => void>();
    
    const mainUnsubscribe = onSnapshot(connectionsQuery, (snapshot) => {
        snapshot.forEach(peerDoc => {
            const peerId = peerDoc.id;
            const answerRef = doc(db, peerDoc.ref.path, 'connections', currentUser.uid);

            if (!unsubscribes.has(peerId)) {
                const unsub = onSnapshot(answerRef, (answerSnap) => {
                    const data = answerSnap.data();
                    if (data?.answer) {
                        const pc = peerConnectionsRef.current.get(peerId);
                        if (pc && pc.signalingState !== 'stable') {
                             pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                        }
                    }
                });
                unsubscribes.set(peerId, unsub);
            }
        });
    });
    
    return () => {
        mainUnsubscribe();
        unsubscribes.forEach(unsub => unsub());
    };

  }, [isVoiceConnected, currentUser, roomId]);


  const leaveVoiceChannel = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;

    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    setRemoteStreams(new Map());

    // Basic cleanup of this user's signaling docs
    if (currentUser) {
        const myPeerRef = doc(db, 'studyRooms', roomId, 'peers', currentUser.uid);
        deleteDoc(myPeerRef);
    }
    
    setIsVoiceConnected(false);
  }, [currentUser, roomId]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsMuted(prev => !prev);
    }
  }, []);

  return {
    isVoiceConnected,
    isMuted,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    remoteStreams,
  };
}

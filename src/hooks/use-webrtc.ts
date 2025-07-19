
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

export function useWebRTC(roomId: string, currentUser: User | null) {
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [speakingPeers, setSpeakingPeers] = useState<Set<string>>(new Set());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodesRef = useRef<Map<string, { analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>>(new Map());

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

  useEffect(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;

    const interval = setInterval(() => {
      const currentlySpeaking = new Set<string>();
      analyserNodesRef.current.forEach((nodes, userId) => {
        const dataArray = new Uint8Array(nodes.analyser.frequencyBinCount);
        nodes.analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        if (average > 20) { // Threshold for speaking
          currentlySpeaking.add(userId);
        }
      });
      setSpeakingPeers(currentlySpeaking);
    }, 200); // Check every 200ms

    return () => {
      clearInterval(interval);
      audioContext.close();
    };
  }, []);

  useEffect(() => {
    remoteStreams.forEach((stream, userId) => {
        if (!analyserNodesRef.current.has(userId) && audioContextRef.current) {
            const source = audioContextRef.current.createMediaStreamSource(stream);
            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 512;
            source.connect(analyser);
            analyserNodesRef.current.set(userId, { source, analyser });
        }
    });

    // Cleanup for streams that are removed
    analyserNodesRef.current.forEach((nodes, userId) => {
        if (!remoteStreams.has(userId)) {
            nodes.source.disconnect();
            analyserNodesRef.current.delete(userId);
        }
    });
  }, [remoteStreams]);


  const createPeerConnection = useCallback((peerId: string) => {
    if (!currentUser) return;
    
    const pc = new RTCPeerConnection(servers);
    
    localStreamRef.current?.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });
    
    pc.ontrack = (event) => {
      addRemoteStream(peerId, event.streams[0]);
    };

    const myId = currentUser.uid;
    const peerConnectionsCollection = collection(db, 'studyRooms', roomId, 'peers', myId, 'connections', peerId, 'iceCandidates');
    const remoteIceCandidatesCollection = collection(db, 'studyRooms', roomId, 'peers', peerId, 'connections', myId, 'iceCandidates');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(peerConnectionsCollection, event.candidate.toJSON());
      }
    };
    
    onSnapshot(remoteIceCandidatesCollection, (snapshot) => {
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

  const leaveVoiceChannel = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    localStreamRef.current = null;

    peerConnectionsRef.current.forEach(pc => pc.close());
    peerConnectionsRef.current.clear();
    setRemoteStreams(new Map());

    if (currentUser) {
        const myPeerRef = doc(db, 'studyRooms', roomId, 'peers', currentUser.uid);
        deleteDoc(myPeerRef);
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
    createPeerConnection, // Export for use in the main hook
  };
}

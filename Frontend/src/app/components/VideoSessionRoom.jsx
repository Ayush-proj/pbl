import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getSocketInstance } from '../../hooks/useSocket';
import { completeSession } from '../services/api';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Clock, AlertTriangle, Camera, RefreshCw, Users } from 'lucide-react';
import { toast } from 'sonner';

function VideoSessionRoom({ booking, userRole = 'candidate', onEnd }) {
  // Safety check for null/undefined booking
  if (!booking || !booking._id) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-xl text-muted-foreground mb-4">No session data available</p>
          <button 
            onClick={onEnd}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null); // null = not started yet
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false); // Modal for end meeting options
  const [mediaError, setMediaError] = useState(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [peerCount, setPeerCount] = useState(0);       // How many users in room
  const [peerConnected, setPeerConnected] = useState(false); // Is the remote video streaming
  const [joinedRoom, setJoinedRoom] = useState(false);  // Have we joined the socket room
  const [sessionStarted, setSessionStarted] = useState(false); // Is session timer running
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const iceCandidateQueue = useRef([]);  // Queue ICE candidates until remote description is set
  const socketRef = useRef(null);
  const roomId = booking?.meetingLink || `room_${booking?._id}`;
  const sessionDuration = (booking?.duration || 15) * 60; // in seconds
  
  // ─── MOBILE-FRIENDLY MEDIA CONSTRAINTS ───
  const getMediaConstraints = () => ({
    video: {
      facingMode: 'user',
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    }
  });

  // ─── START LOCAL VIDEO ───
  const startLocalVideo = useCallback(async () => {
    setMediaError(null);
    setMediaReady(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMediaError('camera_unsupported');
      return;
    }

    try {
      localStream.current = await navigator.mediaDevices.getUserMedia(getMediaConstraints());
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }
      setMediaReady(true);
      setMediaError(null);
    } catch (err) {
      console.error('Full media access failed:', err.name, err.message);
      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setMediaReady(true);
        setIsVideoOff(true);
        setMediaError('camera_only_failed');
        toast.info('Camera unavailable — joined with audio only.');
      } catch (audioErr) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setMediaError('permission_denied');
        } else if (err.name === 'NotFoundError') {
          setMediaError('no_device');
        } else if (err.name === 'NotReadableError') {
          setMediaError('device_in_use');
        } else if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
          setMediaError('insecure_context');
        } else {
          setMediaError('unknown');
        }
      }
    }
  }, []);

  // Start camera on mount
  useEffect(() => {
    startLocalVideo();
    return () => {
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [startLocalVideo]);

  // ─── CREATE PEER CONNECTION (without creating offer) ───
  const createPeerConnection = useCallback(() => {
    if (peerConnection.current) {
      peerConnection.current.close();
    }

    const socket = socketRef.current;
    if (!socket) {
      console.error('Socket not available');
      return null;
    }

    const config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
      ]
    };

    const pc = new RTCPeerConnection(config);
    peerConnection.current = pc;

    // Add local tracks
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        pc.addTrack(track, localStream.current);
      });
    }

    // Handle incoming remote stream
    pc.ontrack = (event) => {
      console.log('🎥 Received remote track:', event.track.kind);
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setPeerConnected(true);
      }
    };

    // Handle ICE candidates — send to other peer via server
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('webrtc:ice-candidate', {
          roomId,
          candidate: event.candidate
        });
      }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      console.log('📶 Connection state:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setPeerConnected(true);
        toast.success('Connected to peer!');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setPeerConnected(false);
        toast.error('Peer connection lost.');
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('🧊 ICE state:', pc.iceConnectionState);
    };

    return pc;
  }, [roomId]);

  // ─── CREATE AND SEND OFFER (only called by initiator) ───
  const createAndSendOffer = useCallback(async () => {
    const pc = peerConnection.current || createPeerConnection();
    if (!pc || !socketRef.current) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('📤 Sending WebRTC offer for room:', roomId);
      socketRef.current.emit('webrtc:offer', { roomId, offer });
    } catch (err) {
      console.error('Failed to create offer:', err);
    }
  }, [roomId, createPeerConnection]);

  // ─── JOIN ROOM (both users do this) ───
  const joinRoom = useCallback(() => {
    if (!mediaReady) {
      toast.error('Camera/mic not ready yet. Please grant permissions first.');
      return;
    }

    const socket = socketRef.current || getSocketInstance();
    if (!socket) {
      toast.error('Socket not connected. Please wait...');
      return;
    }
    socketRef.current = socket;
    
    // Create peer connection first (ready to receive offer or create one)
    createPeerConnection();
    
    // Join the socket room
    console.log('📤 Joining socket room:', roomId);
    socket.emit('join:room', roomId);
    setJoinedRoom(true);
    
    // Request session time sync (in case session already started)
    socket.emit('session:sync-time', { roomId });
    
    // Start session timer on the server
    socket.emit('session:start', { roomId, duration: sessionDuration });
    
    console.log('🔗 Joined room:', roomId);
  }, [mediaReady, roomId, sessionDuration, createPeerConnection]);

  // ─── SOCKET EVENT HANDLERS ───
  useEffect(() => {
    // Get the global socket instance directly
    const socket = getSocketInstance();
    if (!socket) {
      console.error('❌ No socket available');
      return;
    }
    socketRef.current = socket;

    // Room membership updates
    const onUsersUpdated = (data) => {
      if (data.roomId === roomId) {
        setPeerCount(data.userCount);
        console.log(`👥 Users in room: ${data.userCount}`, data.users);
        
        // If we have 2 users and we're not connected yet, trigger offer creation
        if (data.userCount >= 2 && !peerConnection.current?.localDescription) {
          setTimeout(() => {
            if (!peerConnection.current?.localDescription) {
              console.log('🟢 Creating offer as fallback (no offer received yet)');
              createAndSendOffer();
            }
          }, 2000);
        }
      }
    };

    // Server tells us to create the offer (we are the initiator)
    const onRoomReady = (data) => {
      console.log('📨 Received room:ready event:', data);
      if (data.roomId === roomId) {
        if (data.shouldCreateOffer) {
          console.log('🟢 Room ready — I am the initiator, creating offer...');
          setTimeout(createAndSendOffer, 500);
        } else if (data.waitingForPeer) {
          console.log('⏳ Waiting for peer to create offer...');
        }
      }
    };

    // Received an offer from the other peer — create answer
    const onOffer = async (data) => {
      console.log('📥 Received WebRTC offer from:', data.from);
      const pc = peerConnection.current || createPeerConnection();
      if (!pc) {
        console.error('❌ No peer connection to handle offer');
        return;
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        
        // Process any queued ICE candidates
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log('📤 Sending WebRTC answer');
        socket.emit('webrtc:answer', { roomId, answer });
      } catch (err) {
        console.error('Failed to handle offer:', err);
      }
    };

    // Received an answer to our offer
    const onAnswer = async (data) => {
      console.log('📥 Received WebRTC answer from:', data.from);
      const pc = peerConnection.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        
        // Process any queued ICE candidates
        while (iceCandidateQueue.current.length > 0) {
          const candidate = iceCandidateQueue.current.shift();
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Failed to handle answer:', err);
      }
    };

    // Received ICE candidate
    const onIceCandidate = async (data) => {
      const pc = peerConnection.current;
      if (!pc || !pc.remoteDescription) {
        // Queue the candidate — remote description not set yet
        iceCandidateQueue.current.push(data.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    // Session started (synced timer from server)
    const onSessionStarted = (data) => {
      console.log('⏱️ Session started, duration:', data.duration, 'seconds');
      const elapsed = Math.floor((Date.now() - data.startedAt) / 1000);
      const remaining = Math.max(0, data.duration - elapsed);
      setTimeRemaining(remaining);
      setSessionStarted(true);
    };

    // Time sync response
    const onTimeSync = (data) => {
      console.log('⏱️ Time sync: remaining =', data.remaining);
      setTimeRemaining(data.remaining);
      setSessionStarted(true);
    };

    // Session forcefully ended by both participants
    const onSessionEnded = () => {
      toast.info('Session ended by the other participant.');
      cleanup(false);
    };

    // Peer left the session (but session continues)
    const onPeerLeft = (data) => {
      console.log('👋 Peer left:', data.userType);
      toast.warning(`${data.userType === 'mentor' ? 'Mentor' : 'Candidate'} left the session. Waiting...`);
      setPeerConnected(false);
      setPeerCount(prev => Math.max(0, prev - 1));
    };

    // Peer disconnected unexpectedly
    const onPeerDisconnected = (data) => {
      toast.warning(`${data.userType === 'mentor' ? 'Mentor' : 'Candidate'} disconnected.`);
      setPeerConnected(false);
    };

    // Extension
    const onExtendRequest = () => setShowExtendModal(true);
    const onExtendAccepted = (data) => {
      setTimeRemaining(prev => (prev || 0) + data.additionalMinutes * 60);
      toast.success(`Session extended by ${data.additionalMinutes} minutes`);
    };

    socket.on('room:users-updated', onUsersUpdated);
    socket.on('room:ready', onRoomReady);
    socket.on('webrtc:offer', onOffer);
    socket.on('webrtc:answer', onAnswer);
    socket.on('webrtc:ice-candidate', onIceCandidate);
    socket.on('session:started', onSessionStarted);
    socket.on('session:time-sync', onTimeSync);
    socket.on('session:ended', onSessionEnded);
    socket.on('peer:left', onPeerLeft);
    socket.on('peer:disconnected', onPeerDisconnected);
    socket.on('session:extend-request', onExtendRequest);
    socket.on('session:extend-accepted', onExtendAccepted);

    return () => {
      socket.off('room:users-updated', onUsersUpdated);
      socket.off('room:ready', onRoomReady);
      socket.off('webrtc:offer', onOffer);
      socket.off('webrtc:answer', onAnswer);
      socket.off('webrtc:ice-candidate', onIceCandidate);
      socket.off('session:started', onSessionStarted);
      socket.off('session:time-sync', onTimeSync);
      socket.off('session:ended', onSessionEnded);
      socket.off('peer:left', onPeerLeft);
      socket.off('peer:disconnected', onPeerDisconnected);
      socket.off('session:extend-request', onExtendRequest);
      socket.off('session:extend-accepted', onExtendAccepted);
    };
  }, [roomId, createAndSendOffer, createPeerConnection]);

  // ─── TIMER COUNTDOWN (uses server-synced time) ───
  useEffect(() => {
    if (!sessionStarted || timeRemaining === null) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowExtendModal(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionStarted]);

  // ─── CONTROLS ───
  const toggleMute = () => {
    if (!localStream.current) return;
    localStream.current.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    if (!localStream.current) return;
    localStream.current.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
    });
    setIsVideoOff(!isVideoOff);
  };

  const cleanup = (emitEnd = true) => {
    if (socketRef.current) {
      if (emitEnd) {
        // Notify others that we left (session continues for remaining participants)
        socketRef.current.emit('peer:left', {
          roomId,
          actualDuration: sessionDuration - (timeRemaining || 0)
        });
      }
      socketRef.current.emit('leave:room', roomId);
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    onEnd?.();
  };

  // End session for EVERYONE (when time runs out)
  const endSessionForEveryone = () => {
    if (socketRef.current) {
      socketRef.current.emit('session:force-end', {
        roomId,
        actualDuration: sessionDuration - (timeRemaining || 0)
      });
      socketRef.current.emit('leave:room', roomId);
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    setShowExtendModal(false);
    onEnd?.();
  };

  // Mentor ends meeting for everyone (completes session)
  const mentorEndMeeting = async () => {
    try {
      toast.loading('Ending session...');
      await completeSession(booking._id);
      toast.success('Session completed successfully!');
      
      // Notify others and end
      if (socketRef.current) {
        socketRef.current.emit('session:force-end', {
          roomId,
          actualDuration: sessionDuration - (timeRemaining || 0)
        });
        socketRef.current.emit('leave:room', roomId);
      }
      if (peerConnection.current) {
        peerConnection.current.close();
        peerConnection.current = null;
      }
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
        localStream.current = null;
      }
      onEnd?.();
    } catch (err) {
      toast.error('Failed to complete session');
      console.error(err);
    }
  };

  const acceptExtension = (minutes) => {
    if (socketRef.current) {
      socketRef.current.emit('session:extend-accepted', { roomId, minutes });
    }
    setShowExtendModal(false);
  };

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ─── ERROR CONTENT ───
  const getErrorContent = () => {
    const errorMap = {
      permission_denied: {
        title: 'Camera & Mic Blocked',
        desc: 'Your browser blocked camera/microphone access. Please tap the lock icon 🔒 in your browser\'s address bar, allow camera & microphone, then reload.',
        action: 'Retry After Granting Permission',
      },
      no_device: { title: 'No Camera Found', desc: 'No camera or microphone was detected on this device.', action: 'Retry' },
      device_in_use: { title: 'Camera In Use', desc: 'Your camera is being used by another app. Close it and try again.', action: 'Retry' },
      insecure_context: { title: 'HTTPS Required', desc: 'Camera access requires HTTPS. Please use https:// in the URL.', action: null },
      camera_unsupported: { title: 'Browser Not Supported', desc: 'Use Safari (iOS) or Chrome (Android).', action: null },
      camera_only_failed: null,
      unknown: { title: 'Something Went Wrong', desc: 'Could not access camera or microphone.', action: 'Retry' },
    };
    return errorMap[mediaError] || errorMap.unknown;
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pt-20 sm:pt-24 pb-4 sm:pb-8 px-3 sm:px-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full flex-grow flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-8 gap-2">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-black mb-1 sm:mb-2 truncate">Live Session</h1>
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <span className="text-muted-foreground font-medium truncate">Room: {roomId}</span>
              {joinedRoom && (
                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                  peerCount >= 2 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                }`}>
                  <Users className="w-3 h-3" />
                  {peerCount}/2
                </span>
              )}
            </div>
          </div>

          {sessionStarted && (
            <div className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold text-sm sm:text-base shrink-0 ${
              timeRemaining !== null && timeRemaining < 60 ? 'bg-destructive/10 text-destructive animate-pulse' : 'bg-primary/10 text-primary'
            }`}>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>

        {/* Media Error */}
        {mediaError && mediaError !== 'camera_only_failed' && (() => {
          const err = getErrorContent();
          if (!err) return null;
          return (
            <div className="mb-4 p-4 sm:p-6 rounded-2xl bg-destructive/5 border border-destructive/20 text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-destructive" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-destructive mb-1 sm:mb-2">{err.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-md mx-auto">{err.desc}</p>
              {err.action && (
                <button onClick={startLocalVideo} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm">
                  <RefreshCw className="w-4 h-4" /> {err.action}
                </button>
              )}
            </div>
          );
        })()}

        {/* Video Grid */}
        <div className="flex-grow grid grid-cols-1 gap-4 relative isolate group rounded-2xl overflow-hidden bg-card/30 border border-border/50 p-1.5 sm:p-2 glassmorphism w-full min-h-[50vh] sm:min-h-[60vh]">

          {/* Main video area */}
          <div className="relative rounded-xl overflow-hidden bg-black/40 flex items-center justify-center min-h-[40vh] sm:min-h-[50vh] shadow-inner">

            {/* Pre-join lobby */}
            {!joinedRoom && (
              <div className="text-center absolute z-10 p-6 sm:p-8 glassmorphism rounded-2xl w-[90%] max-w-sm flex flex-col items-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4 sm:mb-6">
                  {mediaReady
                    ? <Video className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                    : <Camera className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground animate-pulse" />
                  }
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">
                  {mediaReady ? 'Ready to join?' : 'Setting up camera...'}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                  {mediaReady
                    ? 'Click below to join the session room. The other participant will see you once they also join.'
                    : 'Please allow camera & microphone access when prompted.'
                  }
                </p>
                <button
                  onClick={joinRoom}
                  disabled={!mediaReady}
                  className={`w-full font-bold py-3 rounded-lg transition-all text-sm sm:text-base ${
                    mediaReady
                      ? 'bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25'
                      : 'bg-muted text-muted-foreground cursor-not-allowed'
                  }`}
                >
                  {mediaReady ? 'Join Session' : 'Waiting for Camera...'}
                </button>
              </div>
            )}

            {/* Waiting for peer */}
            {joinedRoom && !peerConnected && (
              <div className="text-center absolute z-10 p-6 glassmorphism rounded-2xl w-[90%] max-w-sm flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
                <h3 className="text-lg font-bold mb-2">Waiting for the other participant...</h3>
                <p className="text-xs text-muted-foreground">
                  {peerCount >= 2 ? 'Connecting video streams...' : 'Share the session link with your partner.'}
                </p>
              </div>
            )}

            {/* Remote video */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className={`w-full h-full object-cover transition-opacity duration-500 ${peerConnected ? 'opacity-100' : 'opacity-0'}`}
            />
          </div>

          {/* Local video PiP */}
          <div className={`absolute bottom-16 sm:bottom-6 right-3 sm:right-6 w-28 sm:w-48 aspect-video rounded-xl overflow-hidden border-2 border-white/20 shadow-2xl transition-all duration-300 z-10 bg-black ${!joinedRoom ? 'opacity-50 scale-90 blur-sm' : 'hover:scale-105'}`}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
            />
            {isVideoOff && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                <VideoOff className="w-6 h-6 sm:w-8 sm:h-8 text-white/50" />
              </div>
            )}
          </div>

          {/* Controls */}
          {joinedRoom && (
            <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-4 bg-zinc-900/80 backdrop-blur-md px-4 sm:px-6 py-3 sm:py-4 rounded-2xl border border-white/10 shadow-2xl">
              <button
                onClick={toggleMute}
                className={`p-3 sm:p-4 rounded-full transition-all ${isMuted ? 'bg-destructive/10 text-destructive' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-3 sm:p-4 rounded-full transition-all ${isVideoOff ? 'bg-destructive/10 text-destructive' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isVideoOff ? <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Video className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
              <div className="w-px h-6 sm:h-8 bg-white/10 mx-1" />
              
              {/* End Call Button - Different for Mentor vs Candidate */}
              {userRole === 'mentor' ? (
                <button
                  onClick={() => setShowEndModal(true)}
                  className="px-4 sm:px-6 py-3 sm:py-4 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 transition-all flex items-center gap-2 font-bold text-sm"
                  title="End Meeting"
                >
                  <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="hidden sm:inline">End Meeting</span>
                </button>
              ) : (
                <button
                  onClick={() => cleanup(true)}
                  className="p-3 sm:p-4 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all"
                  title="Leave Session"
                >
                  <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* End Meeting Modal (Mentor Only) */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border">
            <div className="p-6">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-6">
                <PhoneOff className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black mb-2">End Meeting?</h3>
              <p className="text-muted-foreground mb-6 font-medium">Choose what happens to the session:</p>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setShowEndModal(false);
                    cleanup(true); // Just leave, session continues for others
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                >
                  <div>
                    <span className="font-bold group-hover:text-primary block">Leave Meeting</span>
                    <span className="text-sm text-muted-foreground">Other participants can continue</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
                <button 
                  onClick={() => {
                    setShowEndModal(false);
                    mentorEndMeeting(); // End for everyone
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all text-left group"
                >
                  <div>
                    <span className="font-bold text-emerald-500 block">End Meeting Completely</span>
                    <span className="text-sm text-muted-foreground">All participants leave, session is completed</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <PhoneOff className="w-4 h-4 text-emerald-500" />
                  </div>
                </button>
              </div>
              <button 
                onClick={() => setShowEndModal(false)}
                className="w-full mt-4 py-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extension Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-border/50">
            <div className="p-6">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black mb-2">Time's Up!</h3>
              <p className="text-muted-foreground mb-6 font-medium">Would you like to extend the session?</p>
              <div className="space-y-3">
                <button onClick={() => acceptExtension(15)} className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group">
                  <span className="font-bold group-hover:text-primary">Extend 15 min</span>
                  <span className="text-sm font-medium text-muted-foreground bg-primary/10 px-3 py-1 rounded-full">+₹150</span>
                </button>
                <button onClick={() => acceptExtension(30)} className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group">
                  <span className="font-bold group-hover:text-primary">Extend 30 min</span>
                  <span className="text-sm font-medium text-muted-foreground bg-primary/10 px-3 py-1 rounded-full">+₹300</span>
                </button>
              </div>
              <div className="mt-8 pt-6 border-t border-border flex justify-end gap-3">
                <button onClick={() => setShowExtendModal(false)} className="px-6 py-2 rounded-lg text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">
                  Continue Session
                </button>
                {userRole === 'mentor' ? (
                  <button onClick={() => { setShowExtendModal(false); setShowEndModal(true); }} className="px-6 py-2 rounded-lg text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors">
                    End Meeting
                  </button>
                ) : (
                  <button onClick={() => cleanup(true)} className="px-6 py-2 rounded-lg text-sm font-bold text-muted-foreground hover:bg-muted transition-colors">
                    Leave Session
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoSessionRoom;

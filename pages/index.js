// pages/index.js
import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [initialTime, setInitialTime] = useState(25 * 60); // Default 25 minutes in seconds
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [timerAnimation, setTimerAnimation] = useState(false);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [theme, setTheme] = useState('green'); // 'green', 'blue', 'purple'
  const [breakTime, setBreakTime] = useState(5); // Break time in minutes
  const [showSettings, setShowSettings] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionHistory, setSessionHistory] = useState([]);

  const intervalRef = useRef(null);
  const progressRef = useRef(null);
  const audioRef = useRef(null);
  const endTimeRef = useRef(null);

  // Request notification permission
  const requestNotificationPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  // Show browser notification
  const showNotification = (title, body) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { 
          body,
          icon: '/favicon.ico'
        });
      } catch (e) {
        console.error("Notification failed:", e);
      }
    }
  };

  // Sync with localStorage on mount to recover active timer
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/service-worker.js').then(
          function(registration) {
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
          },
          function(err) {
            console.log('ServiceWorker registration failed: ', err);
          }
        );
      });
    }

    const savedEndTime = localStorage.getItem('focuswareEndTime');
    const savedIsRunning = localStorage.getItem('focuswareIsRunning') === 'true';
    const savedIsBreak = localStorage.getItem('focuswareIsBreak') === 'true';
    
    if (savedEndTime && savedIsRunning) {
      const end = parseInt(savedEndTime);
      const now = Date.now();
      if (end > now) {
        endTimeRef.current = end;
        setIsRunning(true);
        setIsBreak(savedIsBreak);
        setTimeLeft(Math.round((end - now) / 1000));
      } else {
        localStorage.removeItem('focuswareEndTime');
        localStorage.removeItem('focuswareIsRunning');
      }
    }
  }, []);

  // Calculate display time
  const displayHours = Math.floor(timeLeft / 3600);
  const displayMinutes = Math.floor((timeLeft % 3600) / 60);
  const displaySeconds = timeLeft % 60;
  
  // Calculate progress
  const progress = (timeLeft / initialTime) * 100;
  
  // Terminal-like animation effect
  const [terminalText, setTerminalText] = useState([
    { text: "$ ./start_focus_session.sh", completed: true },
    { text: "Initializing coding environment...", completed: true },
    { text: "Loading concentration modules...", completed: true },
    { text: isRunning ? "Session in progress..." : "Ready to code!", completed: isRunning }
  ]);

  // Theme colors
  const themeColors = {
    green: {
      primary: 'text-green-400',
      secondary: 'text-green-600',
      bg: 'bg-green-600',
      bgHover: 'hover:bg-green-700',
      progress: 'bg-green-500',
      highlight: 'from-green-400 to-teal-500'
    },
    blue: {
      primary: 'text-blue-400',
      secondary: 'text-blue-600',
      bg: 'bg-blue-600',
      bgHover: 'hover:bg-blue-700',
      progress: 'bg-blue-500',
      highlight: 'from-blue-400 to-indigo-500'
    },
    purple: {
      primary: 'text-purple-400',
      secondary: 'text-purple-600',
      bg: 'bg-purple-600',
      bgHover: 'hover:bg-purple-700',
      progress: 'bg-purple-500',
      highlight: 'from-purple-400 to-pink-500'
    }
  };

  const currentTheme = themeColors[theme];

  useEffect(() => {
    if (isRunning) {
      // Ensure we have an endTime if we just started or resumed
      if (!endTimeRef.current) {
        endTimeRef.current = Date.now() + timeLeft * 1000;
        localStorage.setItem('focuswareEndTime', endTimeRef.current.toString());
      }
      localStorage.setItem('focuswareIsRunning', 'true');
      localStorage.setItem('focuswareIsBreak', isBreak.toString());

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const remaining = Math.round((endTimeRef.current - now) / 1000);

        if (remaining <= 0) {
          clearInterval(intervalRef.current);
          setIsRunning(false);
          endTimeRef.current = null;
          localStorage.removeItem('focuswareEndTime');
          localStorage.setItem('focuswareIsRunning', 'false');
          
          // Play notification sound
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed:", e));
          }
          
          // Session ended
          if (!isBreak) {
            setCompletedSessions(prev => prev + 1);
            setShowCompletionMessage(true);
            showNotification('Focus Session Complete!', 'Time to take a break.');
            
            // Save session to history
            const sessionDate = new Date();
            setSessionHistory(prev => [...prev, {
              date: sessionDate.toLocaleDateString(),
              time: sessionDate.toLocaleTimeString(),
              duration: Math.floor(initialTime / 60),
              notes: sessionNotes || "No notes"
            }]);
            
            setTimeout(() => setShowCompletionMessage(false), 3000);
            setIsBreak(true);
            const nextDuration = breakTime * 60;
            setTimeLeft(nextDuration);
            return;
          } else {
            setIsBreak(false);
            showNotification('Break Over!', 'Ready to focus again?');
            setTimeLeft(initialTime);
            return;
          }
        }
        setTimeLeft(remaining);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      localStorage.setItem('focuswareIsRunning', 'false');
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isBreak, initialTime, breakTime, sessionNotes]);

  // Update terminal text based on timer state
  useEffect(() => {
    if (isRunning) {
      setTerminalText(prev => [
        ...prev.slice(0, 3),
        { text: isBreak ? "Break in progress..." : "Coding session in progress...", completed: true }
      ]);
    } else {
      setTerminalText(prev => [
        ...prev.slice(0, 3),
        { text: "Ready to code!", completed: true }
      ]);
    }
  }, [isRunning, isBreak]);

  // Animation effects
  useEffect(() => {
    if (timeLeft <= 10 && timeLeft > 0 && isRunning) {
      setTimerAnimation(true);
    } else {
      setTimerAnimation(false);
    }

    // Add time remaining to title
    document.title = `${isBreak ? 'Break' : 'Focus'} - ${displayHours > 0 ? `${displayHours}:` : ''}${displayMinutes < 10 && displayHours > 0 ? `0${displayMinutes}` : displayMinutes}:${displaySeconds < 10 ? `0${displaySeconds}` : displaySeconds}`;
  }, [timeLeft, isRunning, isBreak, displayHours, displayMinutes, displaySeconds]);

  // Apply time settings
  const applyTimeSettings = () => {
    // Validate hours (0-5)
    const validatedHours = Math.min(Math.max(0, hours), 5);
    
    // If hours is 5, minutes must be 0
    const validatedMinutes = validatedHours === 5 ? 0 : Math.min(Math.max(0, minutes), 59);
    
    // Update state with validated values
    setHours(validatedHours);
    setMinutes(validatedMinutes);
    
    // Calculate total seconds
    const totalSeconds = (validatedHours * 3600) + (validatedMinutes * 60);
    
    // Ensure at least 1 minute
    const finalSeconds = totalSeconds < 60 ? 60 : totalSeconds;
    
    setInitialTime(finalSeconds);
    setTimeLeft(finalSeconds);
    setIsRunning(false);
    setShowSettings(false);
  };

  const startTimer = async () => {
    await requestNotificationPermission();
    endTimeRef.current = Date.now() + timeLeft * 1000;
    localStorage.setItem('focuswareEndTime', endTimeRef.current.toString());
    setIsRunning(true);
    showNotification(isBreak ? 'Break Started' : 'Focus Started', `Timer set for ${formatTime(timeLeft)}`);
  };

  const pauseTimer = () => {
    setIsRunning(false);
    endTimeRef.current = null;
    localStorage.removeItem('focuswareEndTime');
  };

  const resetTimer = () => {
    setIsRunning(false);
    setIsBreak(false);
    endTimeRef.current = null;
    localStorage.removeItem('focuswareEndTime');
    setTimeLeft(initialTime);
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // Helper function to format time for display
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${m < 10 && h > 0 ? `0${m}` : m}:${s < 10 ? `0${s}` : s}`;
  };

  // Icons as SVG functions
  const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3"></polygon>
    </svg>
  );

  const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16"></rect>
      <rect x="14" y="4" width="4" height="16"></rect>
    </svg>
  );

  const ResetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6"></path>
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
    </svg>
  );

  const CodeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  );

  const CoffeeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
      <line x1="6" y1="1" x2="6" y2="4"></line>
      <line x1="10" y1="1" x2="10" y2="4"></line>
      <line x1="14" y1="1" x2="14" y2="4"></line>
    </svg>
  );

  const CheckCircleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );

  const SettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );

  const HistoryIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );

  const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black min-h-screen text-gray-200 flex flex-col items-center justify-center p-4">
      <Head>
        <title>
          {isBreak ? 'Break Time' : 'FocusWare'} | 
          {formatTime(timeLeft)}
        </title>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
      </Head>

      {/* Hidden audio element for notification */}
      <audio ref={audioRef} preload="auto">
        <source src="/notification.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>

      {/* Main Timer Interface */}
      <div className="bg-gray-900 p-6 w-full max-w-md rounded-lg border border-gray-800 shadow-2xl backdrop-blur-sm bg-opacity-80">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className={`mr-2 ${currentTheme.primary}`}>
              <CodeIcon />
            </div>
            <h1 className="text-xl font-mono font-bold bg-gradient-to-r bg-clip-text text-transparent ${currentTheme.highlight}">
              {isBreak ? '< Break_Time />' : '< FocusWare />'}
            </h1>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={toggleSettings} 
              className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
              title="Settings"
            >
              <SettingsIcon />
            </button>
          </div>
        </div>

        {/* Settings Panel (Conditionally Rendered) */}
        {showSettings && (
          <div className="mb-6 bg-gray-800 p-4 rounded-lg border border-gray-700 animate-fadeIn">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-mono text-sm text-gray-400">// Settings</h2>
              <button 
                onClick={toggleSettings}
                className="text-gray-400 hover:text-white"
              >
                <CloseIcon />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Timer Settings */}
              <div>
                <h3 className="font-mono text-xs text-gray-500 mb-2">Timer Configuration</h3>
                <div className="flex space-x-3 mb-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1 font-mono">Hours (0-5)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="5" 
                      value={hours}
                      onChange={(e) => setHours(parseInt(e.target.value) || 0)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 font-mono text-green-400"
                      disabled={isRunning}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1 font-mono">Minutes (0-59)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="59" 
                      value={minutes}
                      onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 font-mono text-green-400"
                      disabled={isRunning || hours === 5}
                    />
                  </div>
                </div>
              </div>
              
              {/* Break Time Settings */}
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-mono">Break Duration (minutes)</label>
                <input 
                  type="number" 
                  min="1" 
                  max="30" 
                  value={breakTime}
                  onChange={(e) => setBreakTime(parseInt(e.target.value) || 5)}
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 font-mono text-blue-400 mb-3"
                  disabled={isRunning}
                />
              </div>
              
              {/* Theme Selection */}
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-mono">Theme</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setTheme('green')}
                    className={`w-8 h-8 rounded-full bg-green-500 ${theme === 'green' ? 'ring-2 ring-white' : ''}`}
                    title="Green Theme"
                  ></button>
                  <button
                    onClick={() => setTheme('blue')}
                    className={`w-8 h-8 rounded-full bg-blue-500 ${theme === 'blue' ? 'ring-2 ring-white' : ''}`}
                    title="Blue Theme"
                  ></button>
                  <button
                    onClick={() => setTheme('purple')}
                    className={`w-8 h-8 rounded-full bg-purple-500 ${theme === 'purple' ? 'ring-2 ring-white' : ''}`}
                    title="Purple Theme"
                  ></button>
                </div>
              </div>
            </div>
            
            <button 
              onClick={applyTimeSettings}
              disabled={isRunning}
              className={`w-full ${currentTheme.bg} ${currentTheme.bgHover} disabled:opacity-50 py-2 rounded font-mono text-sm transition-all duration-200 mt-4 text-white`}
            >
              APPLY_SETTINGS()
            </button>
          </div>
        )}

        {/* Timer Display */}
        <div className="text-center mb-6">
          <div 
            className={`text-6xl font-mono mb-6 ${timerAnimation ? 'text-red-400 animate-pulse' : isBreak ? themeColors.blue.primary : currentTheme.primary}`}
          >
            {formatTime(timeLeft)}
          </div>

          {/* Progress bar with glowing effect */}
          <div className="w-full h-3 bg-gray-800 rounded-full mb-6 overflow-hidden relative">
            <div 
              ref={progressRef}
              className={`h-full ${isBreak ? 'bg-blue-500' : currentTheme.progress} transition-all duration-1000 ease-linear`}
              style={{ width: `${progress}%` }}
            ></div>
            <div 
              className={`absolute top-0 h-full ${isBreak ? 'bg-blue-400' : 'bg-green-400'} opacity-30 transition-all duration-1000 ease-linear blur-sm`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {/* Controls with improved styling */}
          <div className="flex justify-center space-x-4 mb-6">
            {!isRunning ? (
              <button 
                onClick={startTimer}
                className={`${currentTheme.bg} ${currentTheme.bgHover} text-white p-4 rounded-full transition-all duration-200 hover:scale-110 shadow-lg`}
              >
                <PlayIcon />
              </button>
            ) : (
              <button 
                onClick={pauseTimer}
                className="bg-yellow-600 hover:bg-yellow-700 text-white p-4 rounded-full transition-all duration-200 hover:scale-110 shadow-lg"
              >
                <PauseIcon />
              </button>
            )}
            <button 
              onClick={resetTimer}
              className="bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-full transition-all duration-200 hover:scale-110 shadow-lg"
            >
              <ResetIcon />
            </button>
          </div>

          {/* Status indicator with pulse animation */}
          <div className="flex items-center justify-center mb-3">
            <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-red-500 animate-ping' : 'bg-gray-500'} mr-2`}></div>
            <div className={`flex items-center ${isBreak ? themeColors.blue.primary : currentTheme.primary}`}>
              {isBreak ? (
                <div className="mr-2">
                  <CoffeeIcon />
                </div>
              ) : (
                <div className="mr-2">
                  <CodeIcon />
                </div>
              )}
              <span className="font-mono">
                {isBreak ? 'Coffee break' : 'Coding session'} 
                {isRunning ? ' in progress' : ' paused'}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-400 font-mono flex items-center justify-center">
            <div className={`px-2 py-1 rounded-md ${currentTheme.bg} text-white mr-2`}>
              {completedSessions}
            </div>
            Sessions completed
          </div>
        </div>

        {/* Session Notes */}
        <div className="mb-6">
          <label className="block text-xs text-gray-500 mb-1 font-mono">Session Notes:</label>
          <textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="What are you working on?"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 font-mono text-gray-300 h-20 resize-none focus:outline-none focus:ring-1 focus:ring-gray-600"
          />
        </div>

        {/* Terminal Section with improved styling */}
        <div className="bg-black p-4 font-mono text-sm text-green-400 border border-gray-800 rounded-lg h-32 overflow-hidden relative">
          <div className="flex space-x-2 absolute top-2 left-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
          
          <div className="mt-4">
            {terminalText.map((line, index) => (
              <div key={index} className="flex">
                <span className="mr-2">{line.completed ? '>' : '...'}</span>
                <span className={line.completed ? '' : 'animate-pulse'}>
                  {line.text}
                </span>
              </div>
            ))}
            <div className="h-4 border-b-2 border-green-400 animate-pulse w-2 inline-block ml-1"></div>
          </div>
        </div>
        
        {/* Session History Display */}
        {sessionHistory.length > 0 && (
          <div className="mt-4 bg-gray-800 p-3 rounded-lg border border-gray-700">
            <h3 className="font-mono text-xs text-gray-400 mb-2 flex items-center">
              <HistoryIcon className="mr-1" /> Recent Sessions
            </h3>
            <div className="max-h-32 overflow-y-auto">
              {sessionHistory.slice(-3).reverse().map((session, index) => (
                <div key={index} className="border-b border-gray-700 last:border-0 py-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">{session.date} at {session.time}</span>
                    <span className={`${currentTheme.primary}`}>{session.duration} min</span>
                  </div>
                  <p className="text-gray-300 truncate">{session.notes}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Completion Message with improved animation */}
      {showCompletionMessage && (
        <div className="fixed bottom-8 right-8 bg-gradient-to-r from-green-600 to-teal-600 text-white p-4 rounded-lg shadow-xl flex items-center animate-fadeIn backdrop-blur-sm">
          <div className="mr-2">
            <CheckCircleIcon />
          </div>
          <span>Coding session completed! Take a break.</span>
        </div>
      )}

      {/* Add global styles */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes ping {
          75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-ping {
          animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        /* Hide number input arrows */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
        /* Scrollbar styling */
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #1a1a1a;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #444;
        }
      `}</style>
    </div>
  );
}
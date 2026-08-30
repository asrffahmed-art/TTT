const fs = require('fs');
let code = fs.readFileSync('src/components/Chat.tsx', 'utf8');

const eventListenerCode = `
  // Listen for live transcripts from VoiceDialog
  useEffect(() => {
    const handleAddLiveTranscripts = (e: any) => {
      const transcripts = e.detail;
      if (!transcripts || transcripts.length === 0) return;
      
      const userText = transcripts.filter((t: any) => t.role === 'user').map((t: any) => t.text).join(' | ');
      if (!userText) return;

      const summaryPrompt = "لقد تحدثت معك للتو في مكالمة صوتية (Live Voice) وقلت لك: \\n" + userText + "\\n\\nيرجى الرد وتلخيص ما قلته لي في المكالمة باختصار شديد لتوثيق المحادثة، وواصل مساعدتي.";

      const newMessage: Message = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: "📞 مكالمة صوتية:\\n" + userText,
        isUser: true,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, newMessage]);
      
      // Auto trigger AI response for the summary
      setTimeout(() => {
        handleSend(summaryPrompt); 
      }, 500);
    };

    window.addEventListener('thoth_add_live_transcripts', handleAddLiveTranscripts);
    return () => window.removeEventListener('thoth_add_live_transcripts', handleAddLiveTranscripts);
  }, []);
`;

// Remove old listener
code = code.replace(/\/\/ Listen for live transcripts from VoiceDialog[\s\S]*?return \(\) => window\.removeEventListener\('thoth_add_live_transcripts', handleAddLiveTranscripts\);\n  \}, \[\]\);/m, eventListenerCode.trim());

fs.writeFileSync('src/components/Chat.tsx', code);

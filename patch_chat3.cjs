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

      const newMessage: Message = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: "📞 مكالمة صوتية:\\n" + userText,
        isUser: true,
        timestamp: new Date()
      };

      const modelMessageId = Date.now().toString() + "m";
      const pendingMessage: Message = {
        id: modelMessageId,
        text: "جاري توثيق رد المساعد...",
        isUser: false,
        timestamp: new Date()
      };

      setMessages(prev => {
        const updated = [...prev, newMessage, pendingMessage];
        setTimeout(() => {
           messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        return updated;
      });
      
      const runSummary = async () => {
         const summaryPrompt = "لقد أجرينا للتو محادثة صوتية سريعة. ما قلته لك كان: [" + userText + "]. يرجى الرد وتلخيص ما دار بيننا باختصار (خصوصا ما قلته أنت لي في الصوت) لتوثيق المحادثة، وواصل الحديث معي بشكل طبيعي.";
         try {
            const user = auth.currentUser;
            const res = await fetch('/api/chat', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ 
                  message: summaryPrompt,
                  messages: [{ role: 'user', content: summaryPrompt }], 
                  aiClient: 'gemini-3.1-flash',
                  userId: user ? user.uid : null
               })
            });
            const data = await res.json();
            if (data.reply) {
               setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, text: data.reply } : m));
            } else {
               setMessages(prev => prev.filter(m => m.id !== modelMessageId));
            }
         } catch(e) {
            setMessages(prev => prev.filter(m => m.id !== modelMessageId));
         }
      };
      runSummary();
    };

    window.addEventListener('thoth_add_live_transcripts', handleAddLiveTranscripts);
    return () => window.removeEventListener('thoth_add_live_transcripts', handleAddLiveTranscripts);
  }, []);
`;

// Remove old listener
code = code.replace(/\/\/ Listen for live transcripts from VoiceDialog[\s\S]*?return \(\) => window\.removeEventListener\('thoth_add_live_transcripts', handleAddLiveTranscripts\);\n  \}, \[\]\);/m, eventListenerCode.trim());

fs.writeFileSync('src/components/Chat.tsx', code);

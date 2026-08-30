const fs = require('fs');
let code = fs.readFileSync('src/components/Chat.tsx', 'utf8');

const eventListenerCode = `
  // Listen for live transcripts from VoiceDialog
  useEffect(() => {
    const handleAddLiveTranscripts = (e: any) => {
      const transcripts = e.detail;
      if (!transcripts || transcripts.length === 0) return;
      
      const newMessages: Message[] = transcripts.map((t: any) => ({
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text: t.text,
        isUser: t.role === 'user',
        timestamp: new Date()
      }));

      setMessages(prev => {
        const updated = [...prev, ...newMessages];
        return updated;
      });
      
      // Attempt to save (since setMessages doesn't auto-save without the effect)
      // Chat.tsx usually has an effect that saves when messages change, or we can just let it save.
      // But let's trigger a UI update
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    };

    window.addEventListener('thoth_add_live_transcripts', handleAddLiveTranscripts);
    return () => window.removeEventListener('thoth_add_live_transcripts', handleAddLiveTranscripts);
  }, []);
`;

const insertIndex = code.indexOf('// Handle incoming initial message');
if (insertIndex !== -1) {
  code = code.substring(0, insertIndex) + eventListenerCode + '\n\n  ' + code.substring(insertIndex);
  fs.writeFileSync('src/components/Chat.tsx', code);
  console.log('Chat.tsx patched for live transcripts');
} else {
  console.error('Could not find insert index');
}

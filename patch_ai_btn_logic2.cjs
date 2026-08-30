const fs = require('fs');
let code = fs.readFileSync('src/components/KeepNotes.tsx', 'utf8');

const regexNewNote = /onClick=\{\(\) => \{\s*let finalTitle = newTitle[\s\S]*?alert\("تم حفظ الملاحظة ومشاركتها مع المساعد الذكي لتحديثها! ✨"\);\s*\}\}/;
const replacementNewNote = `onClick={async () => {
                    let finalTitle = newTitle.trim() || 'ملاحظة جديدة';
                    let finalContent = newContent.trim();
                    let promptText = \`قم بتحسين صياغة هذه الملاحظة وتدقيقها إملائياً، واجعلها مرتبة:\\nالعنوان: \${finalTitle}\\nالمحتوى: \${finalContent}\`;
                    if (todoItems && todoItems.length > 0) {
                      promptText += \`\\n\\nقائمة المهام المرتبطة:\\n\` + todoItems.map(item => \`\${item.completed ? '[✓]' : '[ ]'} \${item.text}\`).join('\\n');
                    }
                    
                    const newNoteId = \`note_\${Date.now()}\`;
                    const newNote = {
                      id: newNoteId,
                      title: finalTitle,
                      content: finalContent,
                      color: selectedColor,
                      isPinned: newIsPinned,
                      tags: selectedTag.trim() ? selectedTag.trim().split(/[\\s，,]+/).filter(Boolean) : ['عام'],
                      imageUrl: imageUrl.trim() || undefined,
                      audioUrl: audioUrl.trim() || undefined,
                      items: todoItems.length > 0 ? todoItems : undefined,
                      updatedAt: new Date().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    };
                    
                    setNotes(prev => [newNote, ...prev]);
                    setIsCreating(false);
                    setNewTitle('');
                    setNewContent('');
                    setSelectedTag('');
                    setImageUrl('');
                    setAudioUrl('');
                    setTodoItems([]);
                    setNewIsPinned(false);
                    setSelectedColor(COLOR_OPTIONS[0].bg);

                    // Sync to Firestore
                    const user = auth.currentUser;
                    if (user) {
                      try {
                        await setDoc(doc(db, 'users', user.uid, 'notes', newNote.id), cleanObject(newNote));
                      } catch (err) {
                        console.error(err);
                      }
                    }

                    onAction?.({
                      text: promptText,
                      image: imageUrl || undefined,
                      audio: audioUrl || undefined,
                      items: todoItems.length > 0 ? todoItems : undefined,
                      noteId: newNoteId
                    });
                    alert("تم حفظ الملاحظة ومشاركتها مع المساعد الذكي لتحديثها! ✨");
                  }}`;

code = code.replace(regexNewNote, replacementNewNote);


const regexEditNote = /onClick=\{\(\) => \{\s*let promptText = \`قم بتحسين صياغة هذه الملاحظة[\s\S]*?alert\("تم حفظ التعديلات ومشاركتها مع المساعد الذكي لتحديثها! ✨"\);\s*\}\}/;
const replacementEditNote = `onClick={async () => {
                    let promptText = \`قم بتحسين صياغة هذه الملاحظة وتدقيقها إملائياً، واجعلها مرتبة:\\nالعنوان: \${editTitle || 'ملاحظة جديدة'}\\nالمحتوى: \${editContent}\`;
                    if (editTodoItems && editTodoItems.length > 0) {
                      promptText += \`\\n\\nقائمة المهام المرتبطة:\\n\` + editTodoItems.map(item => \`\${item.completed ? '[✓]' : '[ ]'} \${item.text}\`).join('\\n');
                    }
                    
                    const updatedNote = {
                      ...editingNote,
                      title: editTitle.trim() || 'ملاحظة محدثة',
                      content: editContent.trim(),
                      color: editColor,
                      isPinned: editIsPinned,
                      tags: editTags.length > 0 ? editTags : ['عام'],
                      imageUrl: editImageUrl.trim() || undefined,
                      audioUrl: editAudioUrl.trim() || undefined,
                      items: editTodoItems.length > 0 ? editTodoItems : undefined,
                      updatedAt: new Date().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    };
                    setNotes(prev => prev.map(n => n.id === editingNote.id ? updatedNote : n));
                    setEditingNote(null);
                    setEditAudioUrl('');

                    // Sync to Firestore
                    const user = auth.currentUser;
                    if (user) {
                      try {
                        await setDoc(doc(db, 'users', user.uid, 'notes', editingNote.id), cleanObject(updatedNote));
                      } catch (err) {
                        console.error(err);
                      }
                    }

                    onAction?.({
                      text: promptText,
                      image: editImageUrl || undefined,
                      audio: editAudioUrl || undefined,
                      items: editTodoItems.length > 0 ? editTodoItems : undefined,
                      noteId: editingNote.id
                    });
                    alert("تم حفظ التعديلات ومشاركتها مع المساعد الذكي لتحديثها! ✨");
                  }}`;

code = code.replace(regexEditNote, replacementEditNote);
fs.writeFileSync('src/components/KeepNotes.tsx', code);
console.log("KeepNotes logic updated again with sync!");

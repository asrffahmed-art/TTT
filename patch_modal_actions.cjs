const fs = require('fs');
let code = fs.readFileSync('src/components/KeepNotes.tsx', 'utf8');

const regexDelete = /onClick=\{async \(\) => \{\s*if \(window\.confirm\('هل أنت متأكد تماماً من حذف هذه الملاحظة؟ لا يمكن استرجاعها\.'\)\) \{\s*setEditingNote\(null\);\s*setNotes\(prev => prev\.filter\(n => n\.id !== editingNote\.id\)\);\s*const user = auth\.currentUser;\s*if \(user\) \{\s*try \{\s*const \{ deleteDoc, doc \} = require\('firebase\/firestore'\);\s*\/\/ or use existing imports\s*await deleteDoc\(doc\(db, 'users', user\.uid, 'notes', editingNote\.id\)\);\s*\} catch \(e\) \{\s*console\.error\(e\);\s*\}\s*\}\s*\}\s*\}\}/;

const correctDelete = `onClick={async () => {
                    if (window.confirm('هل أنت متأكد تماماً من حذف هذه الملاحظة؟ لا يمكن استرجاعها.')) {
                      setEditingNote(null);
                      setNotes(prev => prev.filter(n => n.id !== editingNote.id));
                      const user = auth.currentUser;
                      if (user) {
                        try {
                          await deleteDoc(doc(db, 'users', user.uid, 'notes', editingNote.id));
                        } catch (e) {
                          console.error(e);
                        }
                      }
                    }
                  }}`;

code = code.replace(regexDelete, correctDelete);

// For the pin button in edit modal:
// I'll make it instantly update the editingNote and sync to Firestore if they pin/unpin!
const oldPin = `onClick={() => setEditIsPinned(!editIsPinned)}`;
const newPin = `onClick={async () => {
                    const newPinnedState = !editIsPinned;
                    setEditIsPinned(newPinnedState);
                    
                    const updatedNote = {
                      ...editingNote,
                      isPinned: newPinnedState,
                      updatedAt: new Date().toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    };
                    setNotes(prev => prev.map(n => n.id === editingNote.id ? updatedNote : n));
                    
                    const user = auth.currentUser;
                    if (user) {
                      try {
                        await setDoc(doc(db, 'users', user.uid, 'notes', editingNote.id), cleanObject(updatedNote), { merge: true });
                      } catch (err) {
                        console.error(err);
                      }
                    }
                  }}`;
code = code.replace(oldPin, newPin);

fs.writeFileSync('src/components/KeepNotes.tsx', code);
console.log("Patched correctly");

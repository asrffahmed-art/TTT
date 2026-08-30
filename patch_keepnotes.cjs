const fs = require('fs');
let code = fs.readFileSync('src/components/KeepNotes.tsx', 'utf8');

// 1. Remove the bottom Sparkles buttons first

const bottomCreateSparkles = `                <button 
                  type="button"
                  onClick={() => {
                    let promptText = \`قم بتحسين صياغة هذه الملاحظة وتدقيقها إملائياً، واجعلها مرتبة:\\nالعنوان: \${newTitle || 'ملاحظة جديدة'}\\nالمحتوى: \${newContent}\`;
                    if (todoItems && todoItems.length > 0) {
                      promptText += \`\\n\\nقائمة المهام المرتبطة:\\n\` + todoItems.map(item => \`\${item.completed ? '[✓]' : '[ ]'} \${item.text}\`).join('\\n');
                    }
                    onAction?.({
                      text: promptText,
                      image: imageUrl || undefined,
                      audio: audioUrl || undefined,
                      items: todoItems.length > 0 ? todoItems : undefined
                    });
                    alert("تمت مشاركة كامل محتوى الملاحظة (بما في ذلك الصور والتسجيلات المهام إن وجدت) مع المساعد الذكي! ✨");
                  }}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-amber-300 transition-all cursor-pointer"
                  title="مساعد الذكاء الاصطناعي لتحسين النص"
                >
                  <Sparkles className="w-4.5 h-4.5 text-amber-300 animate-pulse" />
                </button>`;

code = code.replace(bottomCreateSparkles, '');

const bottomEditSparkles = `                 <button 
                  type="button"
                  onClick={() => {
                    let promptText = \`قم بتحسين صياغة هذه الملاحظة وتدقيقها إملائياً، واجعلها مرتبة:\\nالعنوان: \${editTitle || 'ملاحظة جديدة'}\\nالمحتوى: \${editContent}\`;
                    if (editTodoItems && editTodoItems.length > 0) {
                      promptText += \`\\n\\nقائمة المهام المرتبطة:\\n\` + editTodoItems.map(item => \`\${item.completed ? '[✓]' : '[ ]'} \${item.text}\`).join('\\n');
                    }
                    onAction?.({
                      text: promptText,
                      image: editImageUrl || undefined,
                      audio: editAudioUrl || undefined,
                      items: editTodoItems.length > 0 ? editTodoItems : undefined,
                      noteId: editingNote.id
                    });
                    alert("تمت مشاركة كامل محتوى الملاحظة (بما في ذلك الصور والتسجيلات المهام إن وجدت) مع المساعد الذكي! ✨");
                  }}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-amber-300 transition-all cursor-pointer"
                  title="مساعد الذكاء الاصطناعي لتحسين النص"
                >
                  <Sparkles className="w-4.5 h-4.5 text-amber-300 animate-pulse" />
                </button>`;

code = code.replace(bottomEditSparkles, '');


// 2. Add them to the top bars

const topCreateBar = `              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => {
                    handleAddNote();
                    setIsCreating(false);
                  }}
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  title="حفظ وإغلاق"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>`;

const newTopCreateBar = `              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => {
                    handleAddNote();
                    setIsCreating(false);
                  }}
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  title="حفظ وإغلاق"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    let promptText = \`قم بتحسين صياغة هذه الملاحظة وتدقيقها إملائياً، واجعلها مرتبة:\\nالعنوان: \${newTitle || 'ملاحظة جديدة'}\\nالمحتوى: \${newContent}\`;
                    if (todoItems && todoItems.length > 0) {
                      promptText += \`\\n\\nقائمة المهام المرتبطة:\\n\` + todoItems.map(item => \`\${item.completed ? '[✓]' : '[ ]'} \${item.text}\`).join('\\n');
                    }
                    onAction?.({
                      text: promptText,
                      image: imageUrl || undefined,
                      audio: audioUrl || undefined,
                      items: todoItems.length > 0 ? todoItems : undefined
                    });
                    alert("تمت مشاركة كامل محتوى الملاحظة (بما في ذلك الصور والتسجيلات المهام إن وجدت) مع المساعد الذكي! ✨");
                  }}
                  className="px-3.5 py-1.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-white/80 hover:text-amber-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-amber-500/20"
                  title="مساعد الذكاء الاصطناعي لتحسين النص"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span className="text-xs font-bold text-amber-300 hidden sm:block">المساعد الذكي</span>
                </button>
              </div>`;

code = code.replace(topCreateBar, newTopCreateBar);


const topEditBar = `              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handleSaveEditNote}
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  title="حفظ وإغلاق"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>`;

const newTopEditBar = `              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handleSaveEditNote}
                  className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                  title="حفظ وإغلاق"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    let promptText = \`قم بتحسين صياغة هذه الملاحظة وتدقيقها إملائياً، واجعلها مرتبة:\\nالعنوان: \${editTitle || 'ملاحظة جديدة'}\\nالمحتوى: \${editContent}\`;
                    if (editTodoItems && editTodoItems.length > 0) {
                      promptText += \`\\n\\nقائمة المهام المرتبطة:\\n\` + editTodoItems.map(item => \`\${item.completed ? '[✓]' : '[ ]'} \${item.text}\`).join('\\n');
                    }
                    onAction?.({
                      text: promptText,
                      image: editImageUrl || undefined,
                      audio: editAudioUrl || undefined,
                      items: editTodoItems.length > 0 ? editTodoItems : undefined,
                      noteId: editingNote.id
                    });
                    alert("تمت مشاركة كامل محتوى الملاحظة (بما في ذلك الصور والتسجيلات المهام إن وجدت) مع المساعد الذكي! ✨");
                  }}
                  className="px-3.5 py-1.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-white/80 hover:text-amber-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-amber-500/20"
                  title="مساعد الذكاء الاصطناعي لتحسين النص"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span className="text-xs font-bold text-amber-300 hidden sm:block">المساعد الذكي</span>
                </button>
              </div>`;

code = code.replace(topEditBar, newTopEditBar);

fs.writeFileSync('src/components/KeepNotes.tsx', code);
console.log("KeepNotes updated!");

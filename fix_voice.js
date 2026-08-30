const fs = require('fs');
let code = fs.readFileSync('src/components/VoiceDialog.tsx', 'utf8');

// 1. Fix the selected voice model
code = code.replace(
  /useState<'gemini-3\.1-flash-lite' \| 'gemini-db-model' \| 'gemini-2\.5-flash-native-audio-preview-12-2025'>\('gemini-2\.5-flash-native-audio-preview-12-2025'\);/g,
  "useState<string>('gemini-3.1-flash-live-preview');"
);
code = code.replace(
  /'gemini-2\.5-flash-native-audio-preview-12-2025'/g,
  "'gemini-3.1-flash-live-preview'"
);

// 2. Stateful Resampler
const oldResampleBlock = `      const resample = (input: Float32Array, fromRate: number, toRate: number): Float32Array => {
        if (fromRate === toRate) return input;
        const ratio = fromRate / toRate;
        const newLength = Math.round(input.length / ratio);
        const result = new Float32Array(newLength);
        for (let i = 0; i < newLength; i++) {
          const index = i * ratio;
          const left = Math.floor(index);
          const right = Math.min(input.length - 1, left + 1);
          const weight = index - left;
          result[i] = input[left] * (1 - weight) + input[right] * weight;
        }
        return result;
      };`;

const newResampleBlock = `      let resampleIndex = 0;
      const resample = (input: Float32Array, fromRate: number, toRate: number): Float32Array => {
        if (fromRate === toRate) return input;
        const ratio = fromRate / toRate;
        const newLength = Math.floor((input.length - resampleIndex) / ratio);
        const result = new Float32Array(newLength);
        for (let i = 0; i < newLength; i++) {
          const index = resampleIndex + i * ratio;
          const left = Math.floor(index);
          const right = Math.min(input.length - 1, left + 1);
          const weight = index - left;
          result[i] = input[left] * (1 - weight) + input[right] * weight;
        }
        resampleIndex = (resampleIndex + newLength * ratio) - input.length;
        if (resampleIndex < 0) resampleIndex = 0; // fallback
        return result;
      };`;

if (code.includes(oldResampleBlock)) {
    code = code.replace(oldResampleBlock, newResampleBlock);
} else {
    console.log("Could not find oldResampleBlock!");
}

// 3. Ensure we use ScriptProcessorNode with 1024 chunks
// Wait, I see "createScriptProcessor(1024, 1, 1)" in earlier edits. Let's make sure it's 1024.
if (code.includes("createScriptProcessor(2048")) {
    code = code.replace("createScriptProcessor(2048", "createScriptProcessor(1024");
}

fs.writeFileSync('src/components/VoiceDialog.tsx', code);
console.log("VoiceDialog.tsx updated.");

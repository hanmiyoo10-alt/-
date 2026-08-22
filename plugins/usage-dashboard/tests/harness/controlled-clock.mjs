import fs from 'node:fs';

const clockFile = process.env.UD_BEHAVIOR_CLOCK_FILE;
if (clockFile) {
  const realNow = Date.now.bind(Date);
  Date.now = () => {
    try {
      const value = Number(fs.readFileSync(clockFile, 'utf8'));
      return Number.isFinite(value) ? value : realNow();
    } catch {
      return realNow();
    }
  };
}


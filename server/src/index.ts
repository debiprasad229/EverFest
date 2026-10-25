import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`===============================================`);
  console.log(`🎉 EverFest Server running on port ${env.PORT}`);
  console.log(`🚀 Mode: ${env.NODE_ENV}`);
  console.log(`🔗 API Base: http://localhost:${env.PORT}/api/v1`);
  console.log(`✨ AI Engine: ${env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? 'Google Gemini Live' : 'Intelligent Celebration Engine (Autonomous)'}`);
  console.log(`===============================================`);
});

let appInstance: any = null;

async function getApp() {
  if (!appInstance) {
    try {
      const { createApp } = await import('../server/dist/app.js');
      appInstance = createApp();
    } catch {
      const { createApp } = await import('../server/src/app.js');
      appInstance = createApp();
    }
  }
  return appInstance;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}


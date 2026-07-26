import { app } from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`НоваСтрой API запущен на порту ${config.port} (${config.nodeEnv})`);
});

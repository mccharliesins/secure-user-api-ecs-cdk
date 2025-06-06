const express = require('express');
const app = express();
const port = process.env.PORT || 80;

// json middleware
app.use(express.json());

// root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'hello from ecs fargate',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// health check
app.get('/health', (req, res) => {
  res.status(200).send('ok');
});

// start server
app.listen(port, () => {
  console.log(`app running on port ${port}`);
});

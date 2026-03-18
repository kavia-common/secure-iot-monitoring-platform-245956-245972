const cors = require('cors');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const routes = require('./routes');
const swaggerSpec = require('../swagger');
const { env } = require('./config/env');
const { notFoundHandler, errorHandler } = require('./middleware');

const app = express();

function isAllowedOrigin(origin, allowedOrigins) {
  if (allowedOrigins === '*') {
    return true;
  }

  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
}

function buildDynamicSwaggerSpec(req) {
  const host = req.get('host');
  const protocol = req.secure ? 'https' : req.protocol;

  return {
    ...swaggerSpec,
    servers: [
      {
        url: `${protocol}://${host}`,
        description: 'Current backend host'
      }
    ]
  };
}

app.set('trust proxy', true);
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin, env.corsOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS origin is not allowed.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/openapi.json', (req, res) => {
  res.status(200).json(buildDynamicSwaggerSpec(req));
});

app.use('/docs', swaggerUi.serve, (req, res, next) => {
  swaggerUi.setup(buildDynamicSwaggerSpec(req), {
    explorer: true
  })(req, res, next);
});

app.use('/', routes);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

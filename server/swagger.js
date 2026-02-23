import swaggerUi from 'swagger-ui-express';

const PORT = process.env.PORT || 5001;
const baseUrl = process.env.API_BASE_URL || `http://localhost:${PORT}`;

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'TextileLaunch API',
    description: 'REST API for TextileLaunch (products, orders, settings, auth). Authenticate with session cookie or API key.',
    version: '1.0.0',
  },
  servers: [{ url: baseUrl, description: 'API server' }],
  components: {
    securitySchemes: {
      cookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
        description: 'Session cookie after login',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'API key from Settings → Clés API. Use: Authorization: Bearer <key> or X-API-Key: <key>',
      },
    },
    schemas: {
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'Prod_abc123' },
          ownerId: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number' },
          currency: { type: 'string', example: 'MAD' },
          images: { type: 'array', items: { type: 'string' } },
          attributes: { type: 'array' },
          paymentOptions: { type: 'string', enum: ['cod_only', 'stripe_only', 'both'] },
          createdAt: { type: 'integer' },
        },
      },
      ProductImportItem: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          price: { type: 'number' },
          description: { type: 'string' },
          regularPrice: { type: 'number' },
          currency: { type: 'string', default: 'MAD' },
          sku: { type: 'string' },
          images: { type: 'array', items: { type: 'string' } },
          videos: { type: 'array', items: { type: 'string' } },
          attributes: { type: 'array' },
          category: { type: 'string' },
          paymentOptions: { type: 'string', enum: ['cod_only', 'stripe_only', 'both'] },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        summary: 'Health check',
        tags: ['Health'],
        responses: { 200: { description: 'API is running' } },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Login',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: { 200: { description: 'Success' }, 401: { description: 'Invalid credentials' } },
      },
    },
    '/api/auth/logout': {
      post: {
        summary: 'Logout',
        tags: ['Auth'],
        security: [{ cookie: [] }],
        responses: { 200: { description: 'Logged out' } },
      },
    },
    '/api/auth/me': {
      get: {
        summary: 'Current user',
        tags: ['Auth'],
        security: [{ cookie: [] }, { bearerAuth: [] }],
        responses: { 200: { description: 'User object' }, 401: { description: 'Unauthorized' } },
      },
    },
    '/api/products': {
      get: {
        summary: 'List products',
        tags: ['Products'],
        security: [{ cookie: [] }, { bearerAuth: [] }],
        responses: { 200: { description: 'Array of products' } },
      },
      post: {
        summary: 'Create product',
        tags: ['Products'],
        security: [{ cookie: [] }, { bearerAuth: [] }],
        requestBody: { content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } } },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/products/import': {
      post: {
        summary: 'Bulk import products',
        description: 'Create many products in one request. Auth: session cookie or API key (Bearer or X-API-Key).',
        tags: ['Products'],
        security: [{ cookie: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['products'],
                properties: {
                  products: { type: 'array', items: { $ref: '#/components/schemas/ProductImportItem' } },
                  skipInvalid: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Import result with created/skipped/errors' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/products/bulk-delete': {
      post: {
        summary: 'Bulk delete products',
        description: 'Delete multiple products by ID. Only products owned by the authenticated user are deleted.',
        tags: ['Products'],
        security: [{ cookie: [] }, { bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['ids'],
                properties: { ids: { type: 'array', items: { type: 'string' }, description: 'Product IDs' } },
              },
            },
          },
        },
        responses: { 200: { description: '{ deleted: string[], message: string }' }, 401: { description: 'Unauthorized' } },
      },
    },
    '/api/products/{id}': {
      get: { summary: 'Get product', tags: ['Products'], security: [{ cookie: [] }, { bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Product' } } },
      put: { summary: 'Update product', tags: ['Products'], security: [{ cookie: [] }, { bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
      delete: { summary: 'Delete product', tags: ['Products'], security: [{ cookie: [] }, { bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },
    '/api/orders': {
      get: { summary: 'List orders', tags: ['Orders'], security: [{ cookie: [] }, { bearerAuth: [] }], responses: { 200: { description: 'Array of orders' } } },
      post: { summary: 'Create order', tags: ['Orders'], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 201: { description: 'Created' } } },
    },
    '/api/orders/{id}': {
      get: { summary: 'Get order', tags: ['Orders'], security: [{ cookie: [] }, { bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Order' } } },
      patch: {
        summary: 'Update order status',
        tags: ['Orders'],
        security: [{ cookie: [] }, { bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string' } } } } } },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/api/settings': {
      get: { summary: 'Get settings (current user)', tags: ['Settings'], security: [{ cookie: [] }, { bearerAuth: [] }], responses: { 200: { description: 'Settings object' } } },
      put: { summary: 'Update settings', tags: ['Settings'], security: [{ cookie: [] }, { bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Updated' } } },
    },
    '/api/settings/generate-api-key': {
      post: {
        summary: 'Generate or regenerate API key',
        description: 'Creates a new API key. Stored in DB; can be viewed later via GET /api/settings/api-key.',
        tags: ['Settings'],
        security: [{ cookie: [] }],
        responses: { 201: { description: 'Returns apiKey (show once); also stored for View' } },
      },
    },
    '/api/settings/api-key': {
      get: {
        summary: 'View stored API key',
        description: 'Returns the stored API key for the authenticated user (session only).',
        tags: ['Settings'],
        security: [{ cookie: [] }],
        responses: { 200: { description: '{ apiKey: string | null }' } },
      },
    },
    '/api/settings/{userId}': {
      get: {
        summary: 'Get public settings by user ID',
        tags: ['Settings'],
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Public settings (shop name, logo, pixels, etc.)' } },
      },
    },
    '/api/templates': {
      get: { summary: 'List templates', tags: ['Templates'], security: [{ cookie: [] }, { bearerAuth: [] }], responses: { 200: { description: 'Array of templates' } } },
      post: { summary: 'Create template', tags: ['Templates'], security: [{ cookie: [] }, { bearerAuth: [] }], responses: { 201: { description: 'Created' } } },
    },
    '/api/templates/{id}': {
      get: { summary: 'Get template', tags: ['Templates'], security: [{ cookie: [] }, { bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Template' } } },
      put: { summary: 'Update template', tags: ['Templates'], security: [{ cookie: [] }, { bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Updated' } } },
      delete: { summary: 'Delete template', tags: ['Templates'], security: [{ cookie: [] }, { bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Deleted' } } },
    },
    '/api/gemini/generate': {
      post: { summary: 'Generate content (e.g. product description)', tags: ['Gemini'], security: [{ cookie: [] }, { bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Generated text' } } },
    },
    '/api/analytics/events': {
      post: { summary: 'Track event', tags: ['Analytics'], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'OK' } } },
    },
    '/api/analytics/summary/{productId}': {
      get: { summary: 'Analytics summary for product', tags: ['Analytics'], security: [{ cookie: [] }, { bearerAuth: [] }], parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Summary' } } },
    },
    '/api/integrations/affiliate': {
      get: { summary: 'List affiliate integrations', tags: ['Integrations'], security: [{ cookie: [] }, { bearerAuth: [] }], responses: { 200: { description: 'List' } } },
      post: { summary: 'Add affiliate integration', tags: ['Integrations'], security: [{ cookie: [] }, { bearerAuth: [] }], responses: { 201: { description: 'Created' } } },
    },
    '/api/stripe/create-payment-intent': {
      post: { summary: 'Create Stripe payment intent', tags: ['Stripe'], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Client secret' } } },
    },
  },
};

export function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { explorer: true }));
}

export { openApiSpec };

export * as APIGateway from "./apigateway/index";
export * as SQS from "./sqs/index";

export { middleware as apiGatewayMiddleware } from "./apigateway/index";
export { middlewareParallel as sqsMiddlewareParallel, middlewareSeries as sqsMiddlewareSeries } from "./sqs/index";

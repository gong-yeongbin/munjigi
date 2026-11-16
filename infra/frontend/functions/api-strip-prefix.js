// /api/x → /x. 프론트는 같은 도메인의 /api로 부르고 백엔드는 접두사 없이 받는다(개발 서버의 Vite 프록시 rewrite와 같은 역할).
// CloudFront Functions(cloudfront-js-2.0) viewer-request. /api 자체는 /로 보낸다
function handler(event) {
  var request = event.request;
  request.uri = request.uri.replace(/^\/api/, '') || '/';
  return request;
}

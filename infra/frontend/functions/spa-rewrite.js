// SPA fallback. 마지막 경로 조각에 확장자(.)가 없으면 /index.html로 바꿔 /app/events 같은 경로를 새로고침해도 React Router가 받게 한다.
// 전에는 custom_error_response(403·404 → index.html 200)로 했는데 그건 배포 전역이라 /api/* 의 오류 응답까지 200 HTML로 바꿔 버려 함수로 옮겼다.
// CloudFront Functions(cloudfront-js-2.0) viewer-request. 정적 파일(/assets/x.js, /og.png)은 점이 있어 그대로 통과한다
function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var last = uri.substring(uri.lastIndexOf('/') + 1);
  if (last.indexOf('.') === -1) {
    request.uri = '/index.html';
  }
  return request;
}

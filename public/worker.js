self.addEventListener('message', function(e) {
  if (e.data.command === 'start') {
    self.setInterval(function() {
      self.postMessage('tick');
    }, 10000);
  }
});

describe('scaffold', () => {
  it('runs tests with a fake IndexedDB', () => {
    expect(typeof indexedDB.open).toBe('function');
  });
});

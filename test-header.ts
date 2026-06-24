async function test() {
  try {
    const res = await fetch('http://localhost:3000', {
      headers: {
        'Authorization': 'Bearer foo\r\nbar'
      }
    });
    console.log("Success");
  } catch (e: any) {
    console.error("NATIVE FETCH ERROR:", e.name, e.message);
  }
}
test();

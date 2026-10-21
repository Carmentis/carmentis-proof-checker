import { Liquid } from 'liquidjs';
const engine = new Liquid();
const html = await engine.parseAndRender('Hello, {{ name | capitalize }}!', { name: 'liquid' });
console.log(html);

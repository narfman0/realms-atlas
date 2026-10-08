// Optional bloom for glowing motifs (faerie fire, mythals, lamps). Created lazily the first time it is used.
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import * as THREE from 'three';

export function createPost(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.55, 0.45, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return {
    render() { composer.render(); },
    setSize(w, h) { composer.setSize(w, h); bloom.setSize(w / 2, h / 2); },
  };
}

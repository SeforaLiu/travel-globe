import type {
  Object3DNode,
  MaterialNode,
  GeometryNode,
  LightNode
} from '@react-three/fiber';

// 导入 Three.js 的核心类型
import * as THREE from 'three';

// 关键步骤：扩展 React 的 JSX 命名空间，强制注册所有常用标签。
declare module 'react' {
  // interface Attributes {}

  namespace JSX {
    interface IntrinsicElements {

      // 1. 容器/对象类 (Object3D)
      group: Object3DNode<THREE.Group, typeof THREE.Group>;
      mesh: Object3DNode<THREE.Mesh, typeof THREE.Mesh>;
      points: Object3DNode<THREE.Points, typeof THREE.Points>;

      // 2. 几何体类 (Geometry)
      sphereGeometry: GeometryNode<THREE.SphereGeometry, typeof THREE.SphereGeometry>;
      bufferGeometry: GeometryNode<THREE.BufferGeometry, typeof THREE.BufferGeometry>;

      // 3. 材质类 (Material)
      meshStandardMaterial: MaterialNode<THREE.MeshStandardMaterial, typeof THREE.MeshStandardMaterial>;
      pointsMaterial: MaterialNode<THREE.PointsMaterial, typeof THREE.PointsMaterial>;
      meshBasicMaterial:MaterialNode<THREE.MeshBasicMaterial, typeof THREE.MeshBasicMaterial>;

      // 4. 光照类 (Light)
      ambientLight: LightNode<THREE.AmbientLight, typeof THREE.AmbientLight>;
      directionalLight: LightNode<THREE.DirectionalLight, typeof THREE.DirectionalLight>;
      // 如果未来使用，也可以加上 spotLight, pointLight 等

      // 5. 属性类
      bufferAttribute: Object3DNode<THREE.BufferAttribute, typeof THREE.BufferAttribute> & {
        attach: 'attributes-position' | string; // 明确属性
      };

      // 使用一个更通用的签名来告诉 React，任何以 "google-map-" 开头的元素都是合法的
      // 或者直接使用 'google-map-place-autocomplete-element'
      [elem: string]: any;

      // 确保您的 'google-map-place-autocomplete-element' 声明位于最外层：
      'google-map-place-autocomplete-element': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
        onPlacechange?: (event: CustomEvent<{ place: google.maps.places.Place }>) => void;
        'fields'?: string;
        'country'?: string;
        'placeholder'?: string;
      },
        HTMLElement
      >;
    }
  }
}
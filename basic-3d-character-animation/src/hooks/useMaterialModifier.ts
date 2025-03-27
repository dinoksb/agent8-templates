import { useEffect, useCallback, useRef } from "react";
import * as THREE from "three";
import { Object3D, Material, Mesh } from "three";

export interface BaseMaterialProps extends THREE.MaterialParameters {
  targetObject: Object3D;
  enabled?: boolean;
}

export const useMaterialModifier = (targetObject: Object3D | undefined) => {
  const originalMaterialsRef = useRef(new Map<string, Material>());
  const targetMeshesRef = useRef(new Set<Mesh>());

  // 초기 머테리얼 저장 및 타겟 메시 찾기
  useEffect(() => {
    if (!targetObject) return;

    originalMaterialsRef.current.clear();
    targetMeshesRef.current.clear();

    // 타겟 오브젝트의 모든 메시 찾기
    targetObject.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        targetMeshesRef.current.add(child);
        const material = Array.isArray(child.material)
          ? child.material[0]
          : child.material;
        if (!originalMaterialsRef.current.has(child.uuid)) {
          console.log("find original material", material);
          originalMaterialsRef.current.set(child.uuid, material.clone());
        }
      }
    });
  }, [targetObject]);

  const modifyMaterial = useCallback(
    (modifier: (material: Material) => void) => {
      if (!targetObject) return;

      targetMeshesRef.current.forEach((mesh) => {
        const material = Array.isArray(mesh.material)
          ? mesh.material[0]
          : mesh.material;
        if (material) {
          modifier(material);
          material.needsUpdate = true;
        }
      });
    },
    [targetObject]
  );

  const applyMaterial = useCallback(
    (material: Material) => {
      if (!targetObject) return;

      targetMeshesRef.current.forEach((mesh) => {
        mesh.material = material.clone();
        mesh.material.needsUpdate = true;
      });
    },
    [targetObject]
  );

  const resetMaterials = useCallback(() => {
    if (!targetObject) return;

    targetMeshesRef.current.forEach((mesh) => {
      const originalMaterial = originalMaterialsRef.current.get(mesh.uuid);
      if (originalMaterial) {
        console.log("reset original material", originalMaterial);
        mesh.material = originalMaterial.clone();
        mesh.material.needsUpdate = true;
      }
    });
  }, [targetObject]);

  return {
    modifyMaterial,
    applyMaterial,
    resetMaterials,
  };
};

import { useContext } from "react";
import { Vector3 } from "three";
import { ProjectileSystemContext } from "../components/projectile/ProjectileSystem";
import { ProjectileType } from "../types/projectile";

/**
 * 간소화된 발사 옵션 인터페이스
 */
interface LaunchOptions {
  position: Vector3;
  direction: Vector3;
  type?: ProjectileType;
  options?: Record<string, unknown>;
}

/**
 * 투사체 시스템을 사용하기 위한 훅
 *
 * @returns 투사체 발사 및 관리를 위한 함수들을 제공합니다.
 */
export const useProjectileSystem = () => {
  const context = useContext(ProjectileSystemContext);

  if (!context) {
    throw new Error(
      "useProjectileSystem must be used within a ProjectileSystemProvider"
    );
  }

  return context;
};

/**
 * 마우스 클릭으로 투사체를 발사하기 위한 훅
 *
 * @param options 발사 설정 (쿨다운 시간 등)
 * @returns 이벤트 핸들러 설정/해제 함수
 */
export const useMouseProjectileLauncher = (
  options: {
    cooldown?: number;
    button?: number;
    getFireOptions?: () => Partial<LaunchOptions>;
  } = {}
) => {
  const { fireProjectile } = useProjectileSystem();
  const { cooldown = 500, button = 0, getFireOptions } = options;

  const setupMouseLauncher = () => {
    let lastFireTime = 0;

    const handleMouseClick = (event: MouseEvent) => {
      // 지정된 버튼만 처리 (기본: 좌클릭)
      if (event.button !== button) return;

      // 쿨다운 체크
      const now = Date.now();
      if (now - lastFireTime < cooldown) return;
      lastFireTime = now;

      // 추가 발사 옵션 (있는 경우)
      const additionalOptions = getFireOptions ? getFireOptions() : {};

      // 필수 속성 확인
      if (!additionalOptions.position || !additionalOptions.direction) {
        console.error("Missing required position or direction for projectile");
        return;
      }

      // 투사체 발사
      fireProjectile({
        position: additionalOptions.position,
        direction: additionalOptions.direction,
        type: additionalOptions.type,
        options: additionalOptions.options,
      });
    };

    // 이벤트 리스너 등록
    window.addEventListener("mousedown", handleMouseClick);

    // 클린업 함수 반환
    return () => {
      window.removeEventListener("mousedown", handleMouseClick);
    };
  };

  return { setupMouseLauncher };
};

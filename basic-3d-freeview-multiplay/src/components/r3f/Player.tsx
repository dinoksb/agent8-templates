import React, { useRef, useMemo, useCallback, useImperativeHandle, forwardRef, useEffect } from 'react';
import { useKeyboardControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { CharacterState } from '../../constants/character';
import Assets from '../../assets.json';
import { useGameServer } from '@agent8/gameserver';
import throttle from 'lodash/throttle';
import { PlayerInputs, PlayerRef } from '../../types/player';
import {
  AnimationConfigMap,
  AnimationType,
  CharacterRenderer,
  CharacterRendererRef,
  toQuaternionArray,
  toVector3Array,
  useControllerState,
} from 'vibe-starter-3d';
import { RapierRigidBody } from '@react-three/rapier';
import { usePlayerStore } from '../../stores/playerStore';
import * as THREE from 'three';

/**
 * Network synchronization constants.
 */
const NETWORK_CONSTANTS = {
  SYNC: {
    /** Interval (in milliseconds) for sending updates to the server via throttle. */
    INTERVAL_MS: 100,
    /** Minimum position change (in meters) required to trigger a network update. */
    POSITION_CHANGE_THRESHOLD: 0.01,
    /** Minimum rotation change (in radians) required to trigger a network update. */
    ROTATION_CHANGE_THRESHOLD: 0.01,
  },
};

/**
 * Props for the Player component.
 */
interface PlayerProps {
  /** Initial animation state for the character. */
  initialState?: CharacterState;
  /** Target height for the character model */
  targetHeight?: number;
  /** Key identifying the character model/resources to use. */
  characterKey?: string;
}

/**
 * Hook containing the logic to determine the player's animation state based on inputs.
 */
function usePlayerStates() {
  // Determines the next character state based on current state and inputs.
  const determinePlayerState = React.useCallback((currentState: CharacterState, inputs: PlayerInputs): CharacterState => {
    const { isRevive, isDying, isPunching, isHit, isJumping, isMoving, isRunning } = inputs;

    // State transition priority:
    if (isRevive && currentState === CharacterState.DIE) return CharacterState.IDLE;
    if (isDying || currentState === CharacterState.DIE) return CharacterState.DIE;
    if (isHit) return CharacterState.HIT;
    if (isPunching && currentState !== CharacterState.PUNCH && currentState !== CharacterState.JUMP && currentState !== CharacterState.HIT)
      return CharacterState.PUNCH;
    if (isJumping && currentState !== CharacterState.PUNCH && currentState !== CharacterState.HIT) return CharacterState.JUMP;
    if (currentState === CharacterState.PUNCH) return CharacterState.PUNCH; // Maintain punch until animation finishes

    // Movement states (only if not in an interruptible state like jump/hit/punch)
    if (currentState !== CharacterState.JUMP && currentState !== CharacterState.HIT && currentState !== CharacterState.PUNCH) {
      if (isMoving) {
        return isRunning ? CharacterState.RUN : CharacterState.WALK;
      } else {
        return CharacterState.IDLE;
      }
    }
    // Default: maintain current state
    return currentState;
  }, []);

  return { determinePlayerState };
}

/**
 * Player component - Represents the local player character.
 * Manages inputs, state transitions, animations, and network synchronization.
 */
const Player = forwardRef<PlayerRef, PlayerProps>(({ initialState = CharacterState.IDLE, targetHeight = 1.6, characterKey = 'y-bot.glb' }, ref) => {
  const { server, connected, account } = useGameServer();
  const { registerPlayerRef, unregisterPlayerRef } = usePlayerStore();
  const [, getKeyboardInputs] = useKeyboardControls();
  const { determinePlayerState } = usePlayerStates();
  const { rigidBody: controllerRigidBody, childrenGroup: controllerChildrenGroup, setPosition, setRotation, setVelocity } = useControllerState();
  const currentStateRef = useRef<CharacterState>(initialState);

  const playerRef = useRef<RapierRigidBody>(null);
  const characterRendererRef = useRef<CharacterRendererRef>(null);

  // IMPORTANT: Update player reference
  useEffect(() => {
    playerRef.current = controllerRigidBody;
  }, [controllerRigidBody]);

  // IMPORTANT: Register player reference
  useEffect(() => {
    if (!account) return;

    registerPlayerRef(account, playerRef);

    return () => {
      unregisterPlayerRef(account);
    };
  }, [account, registerPlayerRef, unregisterPlayerRef]);

  // Ref to store the previously *sent* state for dirty checking
  const prevSentStateRef = useRef({
    position: new THREE.Vector3(),
    rotation: new THREE.Quaternion(),
    state: initialState,
  });

  useImperativeHandle(
    ref,
    () => ({
      get boundingBox() {
        return characterRendererRef.current?.boundingBox || null;
      },
    }),
    [],
  );

  // Memoized map of animation configurations.
  const animationConfigMap: AnimationConfigMap = useMemo(
    () => ({
      [CharacterState.IDLE]: {
        url: Assets.animations.idle.url,
        loop: true,
      },
      [CharacterState.WALK]: {
        url: Assets.animations.walk.url,
        loop: true,
      },
      [CharacterState.RUN]: {
        url: Assets.animations.run.url,
        loop: true,
      },
      [CharacterState.JUMP]: {
        url: Assets.animations.jump.url,
        loop: false,
        clampWhenFinished: true,
      },
      [CharacterState.PUNCH]: {
        url: Assets.animations.punch.url,
        loop: false,
        clampWhenFinished: true,
      },
      [CharacterState.HIT]: {
        url: Assets.animations.hit.url,
        loop: false,
        clampWhenFinished: true,
      },
      [CharacterState.DIE]: {
        url: Assets.animations.die.url,
        loop: false,
        duration: 10,
        clampWhenFinished: true,
      },
    }),
    [],
  );

  // Callback triggered when a non-looping animation finishes.
  const handleAnimationComplete = React.useCallback(
    (type: AnimationType) => {
      // Transition back to IDLE only if the state hasn't changed
      if (currentStateRef.current === type) {
        switch (type) {
          case CharacterState.JUMP:
          case CharacterState.PUNCH:
          case CharacterState.HIT:
            currentStateRef.current = CharacterState.IDLE;
            break;
          default:
            break;
        }
      }
    },
    [currentStateRef],
  );

  // Optimized network synchronization function
  const throttledSyncToNetwork = useMemo(
    () =>
      throttle(
        async (position: THREE.Vector3, rotation: THREE.Quaternion, state: CharacterState) => {
          if (!server || !connected) return;

          try {
            //console.log('syncToNetwork', position, rotation, state);
            server.remoteFunction('updateMyState', [{ position: toVector3Array(position), rotation: toQuaternionArray(rotation), state }], {
              needResponse: false,
              throttle: 50,
            });
          } catch (error) {
            console.error(`[Player] Network sync failed:`, error);
          }
        },
        NETWORK_CONSTANTS.SYNC.INTERVAL_MS,
        { leading: true, trailing: true },
      ),
    [server],
  );

  // Simplified network synchronization logic
  const syncToNetwork = useCallback(
    async (currentPosition: THREE.Vector3, currentRotation: THREE.Quaternion, currentState: CharacterState) => {
      if (!server || !connected) return;

      // Efficient dirty checking
      const positionDiff = currentPosition.distanceTo(prevSentStateRef.current.position);
      const rotationDiff = currentRotation.angleTo(prevSentStateRef.current.rotation);
      const stateChanged = currentState !== prevSentStateRef.current.state;

      // Network update only when there's sufficient change
      if (
        stateChanged ||
        positionDiff >= NETWORK_CONSTANTS.SYNC.POSITION_CHANGE_THRESHOLD ||
        rotationDiff >= NETWORK_CONSTANTS.SYNC.ROTATION_CHANGE_THRESHOLD
      ) {
        // Update state before network call to prevent duplicate calls
        prevSentStateRef.current.position.copy(currentPosition);
        prevSentStateRef.current.rotation.copy(currentRotation);
        prevSentStateRef.current.state = currentState;

        // Async call without await to avoid blocking frame rendering
        throttledSyncToNetwork(currentPosition, currentRotation, currentState);
      }
    },
    [server, throttledSyncToNetwork],
  );

  const currentPosition = new THREE.Vector3();
  const currentRotation = new THREE.Quaternion();

  // Main update loop
  useFrame(() => {
    if (!controllerRigidBody) return;

    // 1. Process inputs
    const inputs = getKeyboardInputs();
    const { forward, backward, leftward, rightward, run, jump, action1, action2, action3, action4 } = inputs;

    // 2. Calculate movement state
    const isMoving = forward || backward || leftward || rightward;
    const currentVel = controllerRigidBody.linvel() || { y: 0 };

    // 3. Determine player state
    const playerInputs: PlayerInputs = {
      isRevive: action4,
      isDying: action3,
      isPunching: action1,
      isHit: action2,
      isJumping: jump,
      isMoving,
      isRunning: run,
      currentVelY: currentVel.y,
    };
    const newState = determinePlayerState(currentStateRef.current, playerInputs);
    currentStateRef.current = newState;

    // 4. Get current transform information
    controllerChildrenGroup.getWorldPosition(currentPosition);
    controllerChildrenGroup.getWorldQuaternion(currentRotation);

    // 5. Network synchronization
    syncToNetwork(currentPosition, currentRotation, newState);
  });

  if (!server || !connected) return null;

  const characterUrl = useMemo(() => {
    const characterData = (Assets.characters as Record<string, { url: string }>)[characterKey];
    return characterData?.url || Assets.characters['base-model'].url;
  }, [characterKey]);

  // Render the character model and animations
  return (
    <CharacterRenderer
      ref={characterRendererRef}
      url={characterUrl}
      animationConfigMap={animationConfigMap}
      currentAnimationRef={currentStateRef}
      targetHeight={targetHeight}
      onAnimationComplete={handleAnimationComplete}
    />
  );
});

export default Player;

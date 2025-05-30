# Basic 3D First Person View (FPV) - FPS

## Project Summary

This project is a multi-player First Person View (FPV) 3D FPS game built using Three.js and React Three Fiber.

## Implementation Strategy

This project uses a **Three.js-based 3D approach** because:

- It requires real-time 3D character animation and control
- Three.js provides efficient 3D rendering in web browsers
- React Three Fiber simplifies integration with React components
- The vibe-starter-3d library provides essential character rendering and animation tools

Key technologies:

- Three.js for 3D rendering
- React Three Fiber for React integration
- @react-three/rapier for physics simulation
- @react-three/drei for useful Three.js helpers
- vibe-starter-3d for character rendering and animation
- Tailwind CSS for styling

## Implemented Features

- Keyboard-controlled character movement (WASD/Arrow keys)
- Attack by clicking the left mouse button
- First person view camera that follows the character
- Physics-based character movement with collision detection
- 3D environment with floor
- Pointer lock for immersive control

## File Structure Overview

### `src/main.tsx`

- Entry point for the application.
- Sets up React rendering and mounts the `App` component.

### `src/App.tsx`

- Main application component.
- Configures the overall layout and includes the `RoomManager` component.

### `src/App.css`

- Defines the main styles for the `App` component and its child UI elements.

### `src/index.css`

- Defines global base styles, Tailwind CSS directives, fonts, etc., applied throughout the application.

### `src/assets.json`

- File for managing asset metadata. (Currently empty)

### `src/constants/`

- Directory defining constant values used throughout the application.
  - **`character.ts`**: Defines character-related settings (e.g., movement speed, jump height).
  - **`controls.ts`**: Defines settings that map keyboard inputs (WASD, arrow keys, etc.) to corresponding actions (movement, firing, etc.).

### `src/components/`

- Directory managing React components categorized by function.

  - **`r3f/`**: Contains 3D components related to React Three Fiber.

    - **`CharacterPreview.tsx`**: Component for displaying a character preview in the UI.
    - **`EffectContainer.tsx`**: Groups and manages various visual effect components like bullets, muzzle flash, and explosions.
    - **`Experience.tsx`**: Main component responsible for the primary 3D scene configuration. Includes lighting, environment `Environment`, the floor `Floor` component, and the `FollowLight` component that provides dynamic lighting following the player. It also renders the `Player` component within the `FirstPersonViewController`.
    - **`Floor.tsx`**: Defines and visually represents the ground plane in the 3D space. Has physical properties.
    - **`NetworkContainer.tsx`**: Manages the local player `Player` and remote players `RemotePlayer` within the scene.
    - **`Player.tsx`**: Represents the local player's character, handling movement, camera, and interactions based on user input and network state. Implements FirstPersonViewController logic.
    - **`RemotePlayer.tsx`**: Represents other players in the game, synchronizing their state based on network updates.
    - **`effects/`**: Sub-directory containing components related to visual effects.
      - **`Bullet.tsx`**: Component defining the visual representation and behavior of bullets fired from the player.
      - **`BulletEffectController.tsx`**: Manages the entire bullet effect system, including creation, state updates, and recycling (Object Pooling).
      - **`Explosion.tsx`**: Component generating visual explosion effects.
      - **`MuzzleFlash.tsx`**: Component that generates and manages the flash effect occurring at the muzzle when firing a gun.

  - **`scene/`**: Contains components related to 3D scene setup and game state.

    - **`GameScene.tsx`**: Sets up the React Three Fiber `Canvas` component (implementing the Pointer Lock feature), utilizes `KeyboardControls` for handling keyboard inputs, configures the physics simulation using the `Physics` component from `@react-three/rapier`, includes the network container `NetworkContainer`, effect container `EffectContainer` and loads the `Experience` component with `Suspense` to initialize the 3D rendering environment.
    - **`LobbyRoom.tsx`**: Component that joins the Colyseus lobby room, displays the list of available game rooms, and provides UI for creating/joining rooms.
    - **`NicknameSetup.tsx`**: UI component where the user enters their nickname and selects a character, utilizing `CharacterPreview`.
    - **`RoomManager.tsx`**: Component responsible for Colyseus Room connection and state management. Conditionally renders `NicknameSetup`, `LobbyRoom`, `GameScene`, etc., based on the connection status with the server.

  - **`ui/`**: Contains general UI components.
    - **`RTT.tsx`**: UI component for displaying Round Trip Time (network latency).

### `src/stores/`

- Directory containing Zustand stores for application state management.
  - **`effectStore.ts`**: Store that manages the state of visual effects like bullets and explosions (e.g., creation, active/inactive).
  - **`networkSyncStore.ts`**: Store that manages network-related state synchronization, including player data and room status.
  - **`playerStore.ts`**: Store that manages the local player's state, such as nickname, character selection, and input actions.

### `src/types/`

- Directory containing TypeScript type definitions.
  - **`effect.ts`**: Defines types related to visual effects (Effect).
  - **`index.ts`**: Exports types from within the `types` directory.
  - **`player.ts`**: Defines types related to player data and state.
  - **`user.ts`**: Defines types related to user information (e.g., session ID, nickname).

### `src/utils/`

- Directory containing utility functions used across the application.
  - **`effectUtils.ts`**: Contains utility functions specifically related to managing and calculating visual effects.

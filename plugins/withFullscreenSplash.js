const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withFullscreenSplash = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosDir = path.join(projectRoot, 'ios');

      if (!fs.existsSync(iosDir)) {
        return config;
      }

      // Recursively find SplashScreen.storyboard
      const findFile = (dir, name) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          if (file === 'Pods' || file === 'build') continue;

          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            const found = findFile(filePath, name);
            if (found) return found;
          } else if (file === name) {
            return filePath;
          }
        }
        return null;
      };

      const storyboardPath = findFile(iosDir, 'SplashScreen.storyboard');

      if (!storyboardPath) {
        console.warn('[withFullscreenSplash] SplashScreen.storyboard not found, skipping');
        return config;
      }

      console.log('[withFullscreenSplash] Modifying:', storyboardPath);
      let contents = fs.readFileSync(storyboardPath, 'utf-8');

      // 1. Modify imageView: add contentMode="scaleAspectFill" and clipsSubviews="YES"
      contents = contents.replace(
        /<imageView\s+([^>]*?)id="EXPO-SplashScreen"([^>]*?)>/g,
        (match, before, after) => {
          let attrs = (before + after)
            .replace(/contentMode="[^"]*"\s*/g, '')
            .replace(/clipsSubviews="[^"]*"\s*/g, '')
            .trim();
          return `<imageView clipsSubviews="YES" contentMode="scaleAspectFill" ${attrs} id="EXPO-SplashScreen">`;
        }
      );

      // 2. Replace constraints with fullscreen constraints
      const fullscreenConstraints = `<constraints>
                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="top" secondItem="EXPO-ContainerView" secondAttribute="top" id="fs-top"/>
                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="leading" secondItem="EXPO-ContainerView" secondAttribute="leading" id="fs-leading"/>
                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="trailing" secondItem="EXPO-ContainerView" secondAttribute="trailing" id="fs-trailing"/>
                            <constraint firstItem="EXPO-SplashScreen" firstAttribute="bottom" secondItem="EXPO-ContainerView" secondAttribute="bottom" id="fs-bottom"/>
                        </constraints>`;

      const constraintsRegex = /(<view[^>]*id="EXPO-ContainerView"[^>]*>[\s\S]*?)<constraints>[\s\S]*?<\/constraints>/;

      if (constraintsRegex.test(contents)) {
        contents = contents.replace(constraintsRegex, `$1${fullscreenConstraints}`);
      } else {
        const subviewsEndRegex = /(<view[^>]*id="EXPO-ContainerView"[^>]*>[\s\S]*?<\/subviews>)/;
        if (subviewsEndRegex.test(contents)) {
          contents = contents.replace(subviewsEndRegex, `$1\n                        ${fullscreenConstraints}`);
        }
      }

      // 3. Update imageView frame to fullscreen
      contents = contents.replace(
        /(<imageView[^>]*id="EXPO-SplashScreen"[^>]*>[\s\S]*?)<rect key="frame"[^/]*\/>/,
        '$1<rect key="frame" x="0" y="0" width="414" height="896"/>'
      );

      fs.writeFileSync(storyboardPath, contents);
      console.log('[withFullscreenSplash] Successfully modified SplashScreen.storyboard for fullscreen');

      return config;
    },
  ]);
};

module.exports = withFullscreenSplash;

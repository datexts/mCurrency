# Working with Martin on this app

- Martin's main work is Azure. This app is a side project, so Claude does the work itself
  (code, Xcode project settings, config files) instead of handing him steps.
- Only when something can't be done from here (e.g. clicking in Xcode on his Mac, App Store Connect,
  signing), tell him exactly what to do, step by step, and he will follow.
- The same applies to his other apps.
- Claude works in the cloud and can't write to his Mac. He copies changes over himself, so after every
  push tell him where to get them: repo, branch, ZIP download link, and the list of changed files
  with their path in his Mac folder (/Users/martin/Documents/iOS Apps Store/mCurrency/).
- Chat with him in Cantonese (Traditional Chinese). Code, comments and commits stay in English.

## iOS release notes
- Build on Mac: `npm ci && npm run build && npx cap sync ios`, then open `ios/App/App.xcodeproj`.
- Archive with destination "Any iOS Device (arm64)". Bump Build number for every upload.
- iPhone only. Mac / Apple Vision "Designed for iPhone" are turned off in build settings.
- Chart tab must fit on one screen with no scrolling, down to iPhone SE size.

## Running the Example

1. Add your universe and token to the SUBMISSION_URL in src/consts.ts
2. Update the upload url in the .backtracejsrc file. Your Symbol access token can be found in Project Settings > Symbols > Access tokens
3. `npm install`
4. `npm run serve` (this will create and serve a production build as you can't see the fallback component in
   development)

## Available Scripts

In the project directory, you can run:

### `npm run serve`

Creates a production build, uploads sourcemaps & source code, and serves the demo app for testing purposes. The ErrorBoundary will not display the fallback component in development mode and that's why this command is useful.

### `npm start`

Runs the app in the development mode. Warning: won't be able to trigger the Fallback component for the Error Boundary
and some toasts will display twice. \
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\

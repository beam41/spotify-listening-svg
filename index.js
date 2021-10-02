const core = require("@actions/core");
const fetch = require("node-fetch");
const { readFile, writeFile } = require("fs");
const { promisify } = require("util");

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

async function main() {
  const rawBasePath = core.getInput("rawBasePath", { required: true });
  const baseSvgPath = core.getInput("baseSvgPath", { required: true });
  const token = core.getInput("token", { required: true });
  const clientId = core.getInput("clientId", { required: true });
  const cliSecret = core.getInput("cliSecret", { required: true });

  // access token expired quickly so I have to use refresh token to get access token first
  console.log("Getting access token..");
  const secret = `${clientId}:${cliSecret}`;
  const secretBase64 = Buffer.from(secret).toString("base64");
  const tokenRequest = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${secretBase64}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token,
    }),
  });
  const tokenRequestData = await tokenRequest.json();
  console.log("Access token received");

  // songs
  console.log("Fetch song data");
  const resSong = await fetch(
    "https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=1",
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenRequestData.access_token}`,
      },
    }
  );

  const dataSong = (await resSong.json()).items[0];
  console.log("Song data fetched");

  console.log("Draw an img");
  let image = (await readFileAsync(baseSvgPath)).toString("utf8");

  image = image.replace(
    "{imgUrl}",
    "data:image/jpeg;base64," +
      (await loadImgBase64(dataSong.album.images[0].url))
  );
  image = image.replace("{songName}", dataSong.name);
  image = image.replace(
    "{artistName}",
    dataSong.artists.map((v) => v.name).join(", ")
  );

  let fileName = `top-song-${Date.now()}.svg`;
  await writeFileAsync(fileName, image);

  console.log("Write readme");
  let readme = (await readFileAsync("README.md")).toString("utf8");
  const imgTag = `<img src="${rawBasePath.replace(
    /\/$/,
    ""
  )}/${fileName}" height="400"/>`;
  readme = readme.replace(
    /<!-- *spotify-listening-svg-start *-->[^]*<!-- *spotify-listening-svg-end *-->/gi,
    "<!-- spotify-listening-svg-start -->\n" +
      `<p align="center>\n  ${imgTag}\n</p>\n` +
      "<!-- spotify-listening-svg-end -->\n"
  );
  await writeFileAsync("README.md", readme);
}

function loadImgBase64(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((response) => response.buffer())
      .then((buffer) => {
        resolve(buffer.toString("base64"));
      });
  });
}

main().catch((err) => core.setFailed(err.message));

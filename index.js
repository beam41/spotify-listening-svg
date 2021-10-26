const core = require("@actions/core");
const fetch = require("node-fetch");
const Color = require("color");
const colorthief = require("colorthief");
const { readFile, writeFile, readdir, unlink } = require("fs").promises;
const { createCanvas } = require('canvas')

async function main() {
  const imgHeight = core.getInput("imgHeight", { required: true });
  const txtFontSizeSong = core.getInput("txtFontSizeSong", { required: true });
  const txtFontSizeArtist = core.getInput("txtFontSizeArtist", { required: true });
  const txtMaxWidth = core.getInput("txtMaxWidth", { required: true });
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
  let image = (await readFile(baseSvgPath)).toString("utf8");
  const imgBuffer = await loadImgBuffer(dataSong.album.images[0].url);

  const dominantColor = await getDominantColor(imgBuffer);
  image = image.replace("{bgFill}", dominantColor.string());
  image = image.replace(
    /{textColorFill}/g,
    dominantColor.isDark() ? "#c9d1d9" : "#24292f"
  );

  image = image.replace(
    "{imgUrl}",
    "data:image/jpeg;base64," + imgBuffer.toString("base64")
  );
  image = image.replace("{songName}", fitText(dataSong.name, "sans-serif", txtFontSizeSong, txtMaxWidth, true));
  image = image.replace(
    "{artistName}",
    fitText(dataSong.artists.map((v) => v.name).join(", "), "sans-serif", txtFontSizeArtist, txtMaxWidth)
  );

  console.log("Remove old img file");
  const fileToDel = (await readdir(".")).filter((f) =>
    /^top-song-\d+\.svg$/.test(f)
  );

  for await (const f of fileToDel) {
    unlink(f);
  }

  console.log("Write new img file");
  let fileName = `top-song-${Date.now()}.svg`;
  await writeFile(fileName, image);

  console.log("Write readme");
  let readme = (await readFile("README.md")).toString("utf8");
  let imgTag = `<img src="${rawBasePath.replace(
    /\/$/,
    ""
  )}/${fileName}" height="${imgHeight}"/>`;

  if (dataSong.external_urls && dataSong.external_urls.spotify) {
    imgTag = `<a href="${dataSong.external_urls.spotify}">${imgTag}</a>`;
  }

  readme = readme.replace(
    /<!-- *spotify-listening-svg-start *-->[^]*<!-- *spotify-listening-svg-end *-->/gi,
    "<!-- spotify-listening-svg-start -->\n" +
      `<p align="center">${imgTag}</p>\n` +
      "<!-- spotify-listening-svg-end -->"
  );
  await writeFile("README.md", readme);
  console.log("Complete");
}

function loadImgBuffer(url) {
  return new Promise((resolve, reject) => {
    fetch(url, {}).then((response) => resolve(response.buffer()));
  });
}

async function getDominantColor(buffer) {
  await writeFile("tempImg.jpg", buffer);
  const result = await colorthief.getColor("tempImg.jpg", 1);
  await unlink("tempImg.jpg");
  return Color.rgb(result);
}

function fitText(text, font, fontSize, maxWidth, isBold = false) {
  const canvas = createCanvas(maxWidth, fontSize)
  const ctx = canvas.getContext('2d');
  ctx.font = `${isBold ? 'bold' : ''} ${fontSize}px ${font}`;
  let ellipsis = false;
  while (true) {
      const currWidth = ctx.measureText(text + (ellipsis ? "..." : "")).width;
      if (currWidth <= maxWidth) {
          return text + (ellipsis ? "..." : "")
      }
      text = text.substring(0, text.length - 1)
      ellipsis = true
  }
}

main().catch((err) => core.setFailed(err.message));

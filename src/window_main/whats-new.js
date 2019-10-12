import { remote } from 'electron';
import { createDiv, queryElements } from 'common/dom-fns';
import { openDialog } from './renderer-util';

// We should clear this on releases and fill as we add new features
const screens = [];

let selectedScreen = 0;
let screenoffset = (screens.length - 1) * 50;

export function showWhatsNew() {
  // Only show if we actually do have stuff to show
  if (screens.length == 0) return;
  const cont = createDiv(["dialog_content"]);
  cont.style.width = "60vw";
  cont.style.height = "80vh";
  cont.style.justifyContent = "center";
  cont.style.overflow = "hidden";

  let title = createDiv(["wnew_title"], "What is new?");
  let subVersion = createDiv(
    ["wnew_sub_version"],
    "Version " + remote.app.getVersion()
  );
  let scrollerContainer = createDiv(["wnew_scroller"]);
  scrollerContainer.style.width = screens.length * 100 + "%";
  scrollerContainer.style.left = screenoffset + selectedScreen * -100 + "%";

  let scrollerPosCont = createDiv(["wnew_scroller_pos_cont"]);

  let prev, next;
  if (screens.length > 1) {
    prev = createDiv(["wnew_prev"]);
    next = createDiv(["wnew_next"]);
  }

  screens.forEach((sc, index) => {
    let imageCont = createDiv(["wnew_image_cont"]);
    let image = createDiv(["wnew_image"]);
    image.style.backgroundImage = `url(../images/new/${sc.image})`;
    let imageTitle = createDiv(["wnew_image_title"], sc.title);
    let imageDesc = createDiv(["wnew_image_desc"], sc.desciption);

    imageCont.appendChild(imageTitle);
    imageCont.appendChild(image);
    imageCont.appendChild(imageDesc);
    scrollerContainer.appendChild(imageCont);

    let pName = "pos_ball_" + index;
    let posBall = createDiv(["wnew_pos_ball", pName]);
    scrollerPosCont.appendChild(posBall);

    if (selectedScreen == index) {
      posBall.classList.toggle("wnew_pos_ball_selected");
    }
  });

  let updateScroller = function() {
    let scrollerContainer = queryElements(".wnew_scroller")[0];
    scrollerContainer.style.left = screenoffset + selectedScreen * -100 + "%";

    screens.forEach((sc, index) => {
      let pName = ".pos_ball_" + index;
      let ball = queryElements(pName)[0];
      ball.classList.remove("wnew_pos_ball_selected");
      if (index == selectedScreen) {
        ball.classList.toggle("wnew_pos_ball_selected");
      }
    });
  };

  cont.appendChild(title);
  cont.appendChild(subVersion);
  cont.appendChild(scrollerContainer);
  cont.appendChild(scrollerPosCont);

  if (screens.length > 1) {
    prev.addEventListener("click", () => {
      selectedScreen -= 1;
      if (selectedScreen < 0) selectedScreen = screens.length - 1;
      updateScroller();
    });

    next.addEventListener("click", () => {
      selectedScreen += 1;
      if (selectedScreen > screens.length - 1) selectedScreen = 0;
      updateScroller();
    });
    cont.appendChild(prev);
    cont.appendChild(next);
  }

  openDialog(cont);
}

const templatetopnav = document.createElement("template");

templatetopnav.innerHTML = `
<div class="topnav" id="topnav">
  <div class="centered-fixed-blur"></div>
  <div class="centered-fixed">
    <img src="/assets/img/scaled_goose_pixel.png" onmouseover="spin(this)"
      onmouseout="unspin(this)" alt="Duck" onClick="home()" width="40px" height="40px" />
    <a id="duckmath-header" class="duckmath-header duckmath-header-link" href="/" onmouseenter="showchildren(this);" onmouseleave="hidechildren(this);">Webbed Web Math Unblocked Games</a>
  </div>
</div>

<div id="hamburger-icon" onclick="toggleMobileMenu(this)">
  <div class="bar1"></div>
  <div class="bar2"></div>
  <div class="bar3"></div>
  <ul class="mobile-menu">
    <li><a href="/">HOME</a></li>
  </ul>
</div>
`;

function spin(element) {
  element.style.transform = "rotate(360deg)";
  element.style.transition = "transform 0.25s ease";
}

function unspin(element) {
  element.style.transform = "";
}

function toggleMobileMenu(menu) {
  menu.classList.toggle("open");
}

document.body.appendChild(templatetopnav.content);


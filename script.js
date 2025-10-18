// Optional JS: basic mobile menu toggling if you want to expand later
const button = document.querySelector('.hamburger');
const links = document.querySelector('.links');
if (button && links){
  button.addEventListener('click', () => {
    const open = links.style.display === 'flex';
    links.style.display = open ? 'none' : 'flex';
    links.style.flexDirection = 'column';
    button.setAttribute('aria-expanded', String(!open));
  });
}

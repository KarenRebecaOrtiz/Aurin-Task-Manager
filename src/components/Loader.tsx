import { useEffect } from 'react';
import gsap from 'gsap';
import styles from './Loader.module.scss';

const Loader = () => {
  useEffect(() => {
    // Wrap reveal elements with parent and child spans
    document.querySelectorAll(`.${styles.reveal}`).forEach((elem) => {
      const spanParent = document.createElement('span');
      const spanChild = document.createElement('span');

      spanParent.classList.add(styles.parent);
      spanChild.classList.add(styles.child);
      spanChild.innerHTML = elem.innerHTML;
      spanParent.appendChild(spanChild);
      elem.innerHTML = '';
      elem.appendChild(spanParent);
    });

    // GSAP timeline
    const tl = gsap.timeline();
    tl.to(`.${styles.child}`, {
      y: '-100%',
      duration: 2,
      ease: 'expo.inOut',
    })
      .to(`#${styles.black}`, {
        height: 0,
        duration: 2,
        delay: -1.2,
        ease: 'expo.inOut',
      })
      .to(`#${styles.green}`, {
        height: '100%',
        duration: 2,
        delay: -2,
        ease: 'expo.inOut',
      })
      .to(`#${styles.white}`, {
        height: '100%',
        duration: 2,
        delay: -1.8,
        ease: 'expo.inOut',
      });

    // Cleanup GSAP animations on component unmount
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div id={styles.main}>

      <div id={styles.green}></div>
      <div id={styles.white}></div>
    </div>
  );
};

export default Loader;
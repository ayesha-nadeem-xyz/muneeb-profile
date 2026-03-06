(function () {
    function createGlowTexture(THREERef, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return new THREERef.CanvasTexture(canvas);
        }

        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(' + color + ', 1)');
        gradient.addColorStop(0.2, 'rgba(' + color + ', 0.8)');
        gradient.addColorStop(0.5, 'rgba(' + color + ', 0.2)');
        gradient.addColorStop(1, 'rgba(' + color + ', 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        return new THREERef.CanvasTexture(canvas);
    }

    function initCinematicOpening() {
        const sceneRoot = document.querySelector('.opening-scene');
        if (!(sceneRoot instanceof HTMLElement)) {
            return;
        }

        const container = sceneRoot.querySelector('.opening-canvas-container');
        const heroText = sceneRoot.querySelector('.opening-hero-content');
        if (!(container instanceof HTMLElement) || !(heroText instanceof HTMLElement)) {
            return;
        }

        const THREERef = window.THREE;
        if (!THREERef) {
            heroText.classList.add('reveal');
            return;
        }

        sceneRoot.classList.add('js-enabled');

        const scene = new THREERef.Scene();
        scene.fog = new THREERef.FogExp2(0x1a1a1c, 0.03);

        const getSize = function () {
            const width = container.clientWidth || window.innerWidth;
            const height = container.clientHeight || window.innerHeight;
            return { width: width, height: height };
        };

        const initialSize = getSize();
        const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const isSmallViewport = Math.min(initialSize.width, initialSize.height) < 860;

        const camera = new THREERef.PerspectiveCamera(45, initialSize.width / Math.max(initialSize.height, 1), 0.1, 1000);
        camera.position.z = 12;

        let renderer;
        try {
            renderer = new THREERef.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
            renderer.setSize(initialSize.width, initialSize.height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarsePointer ? 1.5 : 2));
            container.appendChild(renderer.domElement);
        } catch (error) {
            sceneRoot.classList.remove('js-enabled');
            heroText.classList.add('reveal');
            return;
        }

        const ambientLight = new THREERef.AmbientLight(0xffffff, 0.3);
        scene.add(ambientLight);

        const spotLight = new THREERef.SpotLight(0xffffff, 1.5);
        spotLight.position.set(5, 10, 5);
        spotLight.angle = Math.PI / 4;
        spotLight.penumbra = 0.5;
        scene.add(spotLight);

        const backLight = new THREERef.DirectionalLight(0x888899, 1);
        backLight.position.set(-5, -5, -5);
        scene.add(backLight);

        const whiteGlow = createGlowTexture(THREERef, '200,200,220');
        const darkGlow = createGlowTexture(THREERef, '98,104,116');
        const ambientGreyGlow = createGlowTexture(THREERef, '190,196,208');

        const structureGroup = new THREERef.Group();
        scene.add(structureGroup);

        const coreGeo = new THREERef.IcosahedronGeometry(1.2, 1);
        const coreMat = new THREERef.MeshPhysicalMaterial({
            color: 0x333333,
            metalness: 0.8,
            roughness: 0.2,
            wireframe: true,
            transparent: true,
            opacity: 0.68,
        });
        const core = new THREERef.Mesh(coreGeo, coreMat);
        structureGroup.add(core);

        const latticeGeo = new THREERef.IcosahedronGeometry(2.5, 2);
        const edges = new THREERef.EdgesGeometry(latticeGeo);
        const lineMat = new THREERef.LineBasicMaterial({
            color: 0x666e82,
            transparent: true,
            opacity: 0.45,
        });
        const latticeLines = new THREERef.LineSegments(edges, lineMat);
        structureGroup.add(latticeLines);

        const nodeMat = new THREERef.PointsMaterial({
            size: 0.17,
            map: whiteGlow,
            transparent: true,
            blending: THREERef.AdditiveBlending,
            depthWrite: false,
        });
        const latticeNodes = new THREERef.Points(latticeGeo, nodeMat);
        structureGroup.add(latticeNodes);

        const sparkCount = isCoarsePointer || isSmallViewport ? 560 : 800;
        const sparkGeo = new THREERef.BufferGeometry();
        const sparkPos = new Float32Array(sparkCount * 3);
        const sparkVel = [];

        for (let i = 0; i < sparkCount; i += 1) {
            sparkPos[i * 3] = 0;
            sparkPos[i * 3 + 1] = 0;
            sparkPos[i * 3 + 2] = 0;

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const speed = 0.1 + Math.random() * 0.4;

            sparkVel.push({
                x: Math.sin(phi) * Math.cos(theta) * speed,
                y: Math.sin(phi) * Math.sin(theta) * speed,
                z: Math.cos(phi) * speed,
                life: 1,
                decay: 0.01 + Math.random() * 0.02,
            });
        }

        sparkGeo.setAttribute('position', new THREERef.BufferAttribute(sparkPos, 3));

        const sparkMat = new THREERef.PointsMaterial({
            size: 0.1,
            color: 0xaaaaaa,
            map: whiteGlow,
            transparent: true,
            blending: THREERef.AdditiveBlending,
            depthWrite: false,
        });
        const sparks = new THREERef.Points(sparkGeo, sparkMat);
        sparks.visible = false;
        scene.add(sparks);

        const smokeGroup = new THREERef.Group();
        smokeGroup.visible = false;
        scene.add(smokeGroup);

        const smokeCount = isCoarsePointer || isSmallViewport ? 28 : 40;
        const smokeSprites = [];

        const smokeMat = new THREERef.SpriteMaterial({
            map: darkGlow,
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
            blending: THREERef.NormalBlending,
        });

        for (let i = 0; i < smokeCount; i += 1) {
            const sprite = new THREERef.Sprite(smokeMat.clone());
            sprite.scale.set(1, 1, 1);

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            const speed = 0.02 + Math.random() * 0.05;

            sprite.userData = {
                vx: Math.sin(phi) * Math.cos(theta) * speed,
                vy: Math.sin(phi) * Math.sin(theta) * speed + 0.02,
                vz: Math.cos(phi) * speed,
                life: 1,
                scaleSpeed: 1.01 + Math.random() * 0.03,
                rotSpeed: (Math.random() - 0.5) * 0.05,
            };

            smokeGroup.add(sprite);
            smokeSprites.push(sprite);
        }

        const ambientSmokeGroup = new THREERef.Group();
        ambientSmokeGroup.visible = false;
        scene.add(ambientSmokeGroup);

        const ambientSmokeCount = isCoarsePointer || isSmallViewport ? 46 : 68;
        const ambientSmokeSprites = [];

        const ambientSmokeMat = new THREERef.SpriteMaterial({
            map: ambientGreyGlow,
            transparent: true,
            opacity: 0.7,
            depthWrite: false,
            blending: THREERef.AdditiveBlending,
        });

        const resetAmbientSmoke = function (sprite, randomizeAge) {
            const material = sprite.material;

            sprite.position.set(
                (Math.random() - 0.5) * 12,
                -4.8 - Math.random() * 2.3,
                -7.2 + Math.random() * 2.6
            );

            const baseScale = 1.6 + Math.random() * 2.8;
            sprite.scale.set(baseScale, baseScale, baseScale);

            sprite.userData = {
                vx: (Math.random() - 0.5) * 0.005,
                vy: 0.008 + Math.random() * 0.018,
                vz: 0.0008 + Math.random() * 0.003,
                age: randomizeAge ? Math.random() : 0,
                ageSpeed: 0.004 + Math.random() * 0.005,
                maxOpacity: 0.24 + Math.random() * 0.2,
                scaleGrow: 0.002 + Math.random() * 0.003,
                rotSpeed: (Math.random() - 0.5) * 0.012,
            };

            material.opacity = 0;
            material.color.setHex(0xb4bccb);
        };

        for (let i = 0; i < ambientSmokeCount; i += 1) {
            const ambientSprite = new THREERef.Sprite(ambientSmokeMat.clone());
            resetAmbientSmoke(ambientSprite, true);
            ambientSmokeGroup.add(ambientSprite);
            ambientSmokeSprites.push(ambientSprite);
        }

        const ringGeo = new THREERef.RingGeometry(0.1, 0.2, 64);
        const ringMat = new THREERef.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            side: THREERef.DoubleSide,
            blending: THREERef.AdditiveBlending,
            depthWrite: false,
        });
        const shockwave = new THREERef.Mesh(ringGeo, ringMat);
        shockwave.visible = false;
        shockwave.rotation.x = Math.PI / 3;
        scene.add(shockwave);

        const clock = new THREERef.Clock();
        let totalTime = 0;
        let phase = 0;
        let cameraShake = 0;
        let phaseElapsed = 0;
        let postExplosionTime = 0;

        const compressionDuration = 0.88;
        const revealDelayAfterExplosion = 0.55;
        let ambientSmokeEnabled = false;
        let ambientSmokeIntensity = 0;

        let mouseX = 0;
        let mouseY = 0;
        let targetX = 0;
        let targetY = 0;

        const pointerNdc = new THREERef.Vector2();
        const raycaster = new THREERef.Raycaster();

        const triggerCompression = function () {
            if (phase !== 0) {
                return;
            }
            phase = 1;
            phaseElapsed = 0;
        };

        const updatePointerState = function (clientX, clientY) {
            mouseX = (clientX - window.innerWidth / 2) * 0.001;
            mouseY = (clientY - window.innerHeight / 2) * 0.001;

            const rect = container.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) {
                return false;
            }

            pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            return true;
        };

        const tryPointerCompressionTrigger = function () {
            if (phase !== 0) {
                return;
            }

            raycaster.setFromCamera(pointerNdc, camera);
            const intersectsCore = raycaster.intersectObject(core, false);
            if (intersectsCore.length > 0) {
                triggerCompression();
            }
        };

        const onPointerMove = function (event) {
            if (!updatePointerState(event.clientX, event.clientY)) {
                return;
            }
            tryPointerCompressionTrigger();
        };

        const onPointerDown = function (event) {
            if (!updatePointerState(event.clientX, event.clientY)) {
                return;
            }
            tryPointerCompressionTrigger();
        };

        const onScrollStart = function () {
            triggerCompression();
        };

        const onResize = function () {
            const nextSize = getSize();
            camera.aspect = nextSize.width / Math.max(nextSize.height, 1);
            camera.updateProjectionMatrix();
            renderer.setSize(nextSize.width, nextSize.height);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarsePointer ? 1.5 : 2));
        };

        const previousTouchAction = container.style.touchAction;
        container.style.touchAction = 'pan-y';

        container.addEventListener('pointermove', onPointerMove, { passive: true });
        container.addEventListener('pointerdown', onPointerDown, { passive: true });
        window.addEventListener('wheel', onScrollStart, { passive: true });
        window.addEventListener('scroll', onScrollStart, { passive: true });
        window.addEventListener('touchmove', onScrollStart, { passive: true });
        window.addEventListener('resize', onResize);

        // Ensure the signature orb compression/explosion sequence always appears.
        const autoTriggerTimer = window.setTimeout(triggerCompression, 1600);

        let animationFrameId = 0;
        const animate = function () {
            animationFrameId = window.requestAnimationFrame(animate);

            const delta = clock.getDelta();
            totalTime += delta;
            const frameStep = Math.min(delta * 60, 4);

            if (ambientSmokeEnabled) {
                ambientSmokeIntensity = Math.min(1, ambientSmokeIntensity + delta * 1.35);

                ambientSmokeGroup.position.x += (mouseX * 0.75 - ambientSmokeGroup.position.x) * 0.035;
                ambientSmokeGroup.position.y += (-mouseY * 0.45 - ambientSmokeGroup.position.y) * 0.03;
                ambientSmokeGroup.rotation.y += (mouseX * 0.2 - ambientSmokeGroup.rotation.y) * 0.04;

                for (let i = 0; i < ambientSmokeCount; i += 1) {
                    const sprite = ambientSmokeSprites[i];
                    const data = sprite.userData;
                    const material = sprite.material;

                    data.age += data.ageSpeed * frameStep;

                    const cursorDriftX = mouseX * 0.018;
                    const cursorDriftZ = mouseY * 0.012;

                    sprite.position.x += (data.vx + cursorDriftX) * frameStep;
                    sprite.position.y += data.vy * frameStep;
                    sprite.position.z += (data.vz + cursorDriftZ) * frameStep;
                    sprite.scale.multiplyScalar(1 + data.scaleGrow * frameStep);
                    material.rotation += data.rotSpeed * frameStep;

                    const fade = Math.sin(Math.min(data.age, 1) * Math.PI);
                    material.opacity = Math.max(0, fade * data.maxOpacity * ambientSmokeIntensity);

                    if (data.age >= 1.02 || sprite.position.y > 5.5) {
                        resetAmbientSmoke(sprite, false);
                    }
                }
            }

            targetX = mouseX * 2;
            targetY = mouseY * 2;

            if (phase === 0) {
                structureGroup.rotation.y += 0.2 * delta;
                structureGroup.rotation.x += 0.1 * delta;
                structureGroup.rotation.z += 0.05 * delta;

                const scale = 1 + Math.sin(totalTime * 2) * 0.02;
                structureGroup.scale.set(scale, scale, scale);
            } else if (phase === 1) {
                phaseElapsed += delta;
                const t = Math.min(phaseElapsed / compressionDuration, 1);
                const easeIn = t * t * t;

                const scale = 1 - easeIn * 0.95;
                structureGroup.scale.set(scale, scale, scale);

                structureGroup.rotation.y += (0.2 + easeIn * 2) * delta;
                structureGroup.rotation.x += (0.1 + easeIn * 1.5) * delta;

                coreMat.opacity = 0.6 - easeIn * 0.6;
                lineMat.opacity = 0.3 + easeIn * 0.7;

                if (t >= 1) {
                    phase = 2;
                    structureGroup.visible = false;

                    sparks.visible = true;
                    smokeGroup.visible = true;
                    shockwave.visible = true;
                    ringMat.opacity = 0.8;
                    shockwave.scale.set(1, 1, 1);

                    ambientSmokeEnabled = true;
                    ambientSmokeGroup.visible = true;
                    ambientSmokeIntensity = 0;
                    postExplosionTime = 0;

                    for (let i = 0; i < ambientSmokeCount; i += 1) {
                        resetAmbientSmoke(ambientSmokeSprites[i], true);
                    }

                    cameraShake = 0.72;
                }
            }

            if (phase >= 2) {
                postExplosionTime += delta;

                if (shockwave.visible) {
                    shockwave.scale.x += 18 * delta;
                    shockwave.scale.y += 18 * delta;
                    ringMat.opacity -= 1.9 * delta;
                    if (ringMat.opacity <= 0) {
                        shockwave.visible = false;
                    }
                }

                const sparkPositions = sparkGeo.attributes.position.array;
                let activeSparks = false;

                for (let i = 0; i < sparkCount; i += 1) {
                    const velocity = sparkVel[i];
                    if (velocity.life > 0) {
                        activeSparks = true;

                        velocity.x *= 0.92;
                        velocity.y *= 0.92;
                        velocity.z *= 0.92;

                        sparkPositions[i * 3] += velocity.x;
                        sparkPositions[i * 3 + 1] += velocity.y;
                        sparkPositions[i * 3 + 2] += velocity.z;

                        velocity.life -= velocity.decay;
                    } else {
                        sparkPositions[i * 3] = 999;
                    }
                }

                sparkGeo.attributes.position.needsUpdate = true;
                if (!activeSparks && phase === 2) {
                    sparks.visible = false;
                }

                let activeExplosionSmoke = false;
                for (let i = 0; i < smokeCount; i += 1) {
                    const sprite = smokeSprites[i];
                    const data = sprite.userData;
                    const material = sprite.material;

                    if (data.life > 0) {
                        activeExplosionSmoke = true;

                        sprite.position.x += data.vx;
                        sprite.position.y += data.vy;
                        sprite.position.z += data.vz;

                        sprite.scale.multiplyScalar(data.scaleSpeed);
                        material.rotation += data.rotSpeed;

                        data.life -= 0.008;
                        material.opacity = Math.max(0, data.life * 0.6);
                    } else {
                        material.opacity = 0;
                    }
                }

                if (!activeExplosionSmoke && phase === 2) {
                    smokeGroup.visible = false;
                }

                if (postExplosionTime > revealDelayAfterExplosion && phase === 2) {
                    phase = 3;
                    heroText.classList.add('reveal');
                }
            }

            let shakeX = 0;
            let shakeY = 0;
            if (cameraShake > 0) {
                shakeX = (Math.random() - 0.5) * cameraShake;
                shakeY = (Math.random() - 0.5) * cameraShake;
                cameraShake -= delta * 0.5;

                if (cameraShake < 0) {
                    cameraShake = 0;
                }
            }

            camera.position.x += (targetX - camera.position.x) * 0.05 + shakeX;
            camera.position.y += (-targetY - camera.position.y) * 0.05 + shakeY;
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        };

        animate();

        const cleanup = function () {
            container.style.touchAction = previousTouchAction;

            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('wheel', onScrollStart);
            window.removeEventListener('scroll', onScrollStart);
            window.removeEventListener('touchmove', onScrollStart);
            window.removeEventListener('resize', onResize);

            window.clearTimeout(autoTriggerTimer);
            window.cancelAnimationFrame(animationFrameId);

            smokeSprites.forEach(function (sprite) {
                sprite.material.dispose();
            });
            ambientSmokeSprites.forEach(function (sprite) {
                sprite.material.dispose();
            });

            coreGeo.dispose();
            latticeGeo.dispose();
            edges.dispose();
            sparkGeo.dispose();
            ringGeo.dispose();

            coreMat.dispose();
            lineMat.dispose();
            nodeMat.dispose();
            sparkMat.dispose();
            smokeMat.dispose();
            ambientSmokeMat.dispose();
            ringMat.dispose();

            whiteGlow.dispose();
            darkGlow.dispose();
            ambientGreyGlow.dispose();

            scene.clear();

            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };

        window.addEventListener('beforeunload', cleanup, { once: true });
    }

    document.addEventListener('DOMContentLoaded', function () {
        const root = document.documentElement;
        const siteHeader = document.getElementById('site-header');
        const mainNav = document.getElementById('mainNav');
        const menuBtn = document.getElementById('menu-btn');
        const themeToggle = document.getElementById('theme-toggle');

        const setHeaderState = function () {
            if (!siteHeader) {
                return;
            }
            siteHeader.classList.toggle('is-scrolled', window.scrollY > 20);
        };
        setHeaderState();
        window.addEventListener('scroll', setHeaderState, { passive: true });

        const currentPath = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        document.querySelectorAll('.main-nav a').forEach(function (link) {
            const href = (link.getAttribute('href') || '').toLowerCase();
            if (href === currentPath || (currentPath === '' && href === 'index.html')) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
            }
        });

        const closeNav = function () {
            if (!siteHeader || !menuBtn) {
                return;
            }
            siteHeader.classList.remove('nav-open');
            menuBtn.setAttribute('aria-expanded', 'false');
        };

        if (menuBtn && siteHeader) {
            menuBtn.addEventListener('click', function () {
                const isOpen = siteHeader.classList.toggle('nav-open');
                menuBtn.setAttribute('aria-expanded', String(isOpen));
            });

            document.addEventListener('click', function (event) {
                const target = event.target;
                if (!(target instanceof Node)) {
                    return;
                }
                if (!siteHeader.contains(target)) {
                    closeNav();
                }
            });

            window.addEventListener('resize', function () {
                if (window.innerWidth > 900) {
                    closeNav();
                }
            });
        }

        if (mainNav) {
            mainNav.querySelectorAll('a').forEach(function (link) {
                link.addEventListener('click', closeNav);
            });
        }

        const setThemeButtonLabel = function () {
            if (!themeToggle) {
                return;
            }
            const light = root.getAttribute('data-theme') === 'light';
            themeToggle.innerHTML = light ? '&#9790;' : '&#9728;';
            themeToggle.setAttribute('data-theme-icon', light ? 'moon' : 'sun');
            themeToggle.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
            themeToggle.setAttribute('title', light ? 'Switch to dark theme' : 'Switch to light theme');
        };

        try {
            const storedTheme = localStorage.getItem('muneeb-theme');
            if (storedTheme === 'light') {
                root.setAttribute('data-theme', 'light');
            } else {
                root.removeAttribute('data-theme');
            }
        } catch (error) {
            // Ignore storage access errors.
        }
        setThemeButtonLabel();

        if (themeToggle) {
            themeToggle.addEventListener('click', function () {
                const light = root.getAttribute('data-theme') === 'light';
                if (light) {
                    root.removeAttribute('data-theme');
                    try {
                        localStorage.setItem('muneeb-theme', 'dark');
                    } catch (error) {
                        // Ignore storage access errors.
                    }
                } else {
                    root.setAttribute('data-theme', 'light');
                    try {
                        localStorage.setItem('muneeb-theme', 'light');
                    } catch (error) {
                        // Ignore storage access errors.
                    }
                }
                setThemeButtonLabel();
            });
        }

        const revealElements = document.querySelectorAll('[data-reveal]');
        if (revealElements.length > 0) {
            const revealObserver = new IntersectionObserver(
                function (entries, observer) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('is-visible');
                            observer.unobserve(entry.target);
                        }
                    });
                },
                {
                    threshold: 0.15,
                    rootMargin: '0px 0px -40px 0px',
                }
            );

            revealElements.forEach(function (element) {
                revealObserver.observe(element);
            });
        }

        const skillFills = document.querySelectorAll('.skill-fill[data-level]');
        if (skillFills.length > 0) {
            const animateSkill = function (el) {
                const level = Number(el.getAttribute('data-level'));
                const normalized = Number.isFinite(level) ? Math.max(0, Math.min(level, 100)) / 100 : 0;
                el.style.setProperty('--skill-level', String(normalized));
                el.classList.add('is-animated');
            };

            const skillObserver = new IntersectionObserver(
                function (entries, observer) {
                    entries.forEach(function (entry) {
                        if (entry.isIntersecting) {
                            animateSkill(entry.target);
                            observer.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.25 }
            );

            skillFills.forEach(function (fill) {
                skillObserver.observe(fill);
            });
        }

        const filterButtons = document.querySelectorAll('[data-filter]');
        const projectCards = document.querySelectorAll('[data-project-category]');
        const projectCount = document.querySelector('[data-project-count]');

        const updateProjectCount = function () {
            if (!projectCount) {
                return;
            }
            const visibleCount = Array.from(projectCards).filter(function (card) {
                return !card.classList.contains('is-hidden');
            }).length;
            projectCount.textContent = String(visibleCount);
        };

        if (filterButtons.length > 0 && projectCards.length > 0) {
            filterButtons.forEach(function (button) {
                button.addEventListener('click', function () {
                    const filter = button.getAttribute('data-filter') || 'All';

                    filterButtons.forEach(function (btn) {
                        btn.classList.remove('active');
                    });
                    button.classList.add('active');

                    projectCards.forEach(function (card) {
                        const category = card.getAttribute('data-project-category') || '';
                        const show = filter === 'All' || category === filter;
                        card.classList.toggle('is-hidden', !show);
                    });

                    updateProjectCount();
                });
            });

            updateProjectCount();
        }

        document.querySelectorAll('[data-expand-btn]').forEach(function (button) {
            button.addEventListener('click', function () {
                const card = button.closest('[data-expandable]');
                if (!card) {
                    return;
                }
                const expanded = card.classList.toggle('expanded');
                button.setAttribute('aria-expanded', String(expanded));
                button.textContent = expanded ? 'Hide details' : 'Details';
            });
        });

        document.querySelectorAll('[data-year]').forEach(function (el) {
            el.textContent = String(new Date().getFullYear());
        });

        initCinematicOpening();
    });
})();
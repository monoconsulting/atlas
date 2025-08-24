
E:\projects\Atlas\taskmasterweb>TMW-docker-build.bat

E:\projects\Atlas\taskmasterweb>docker compose down

E:\projects\Atlas\taskmasterweb>docker compose build --no-cache
#1 [internal] load local bake definitions
#1 reading from stdin 586B done
#1 DONE 0.0s

#2 [internal] load build definition from Dockerfile
#2 transferring dockerfile: 862B done
#2 DONE 0.0s

#3 [internal] load metadata for docker.io/library/python:3.11-slim
#3 DONE 0.0s

#4 [internal] load .dockerignore
#4 transferring context: 2B done
#4 DONE 0.0s

#5 [1/7] FROM docker.io/library/python:3.11-slim
#5 DONE 0.0s

#6 [2/7] WORKDIR /srv/app
#6 CACHED

#7 [internal] load build context
#7 transferring context: 1.97kB done
#7 DONE 0.0s

#8 [3/7] RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
#8 0.366 Hit:1 http://deb.debian.org/debian trixie InRelease
#8 0.366 Get:2 http://deb.debian.org/debian trixie-updates InRelease [47.1 kB]
#8 0.368 Get:3 http://deb.debian.org/debian-security trixie-security InRelease [43.4 kB]
#8 0.385 Get:4 http://deb.debian.org/debian trixie/main amd64 Packages [9668 kB]
#8 1.205 Get:5 http://deb.debian.org/debian trixie-updates/main amd64 Packages [2432 B]
#8 1.205 Get:6 http://deb.debian.org/debian-security trixie-security/main amd64 Packages [23.9 kB]
#8 2.023 Fetched 9784 kB in 2s (5787 kB/s)
#8 2.023 Reading package lists...
#8 2.646 Reading package lists...
#8 3.251 Building dependency tree...
#8 3.448 Reading state information...
#8 3.747 ca-certificates is already the newest version (20250419).
#8 3.747 The following additional packages will be installed:
#8 3.748   libbrotli1 libcom-err2 libcurl4t64 libgnutls30t64 libgssapi-krb5-2 libidn2-0
#8 3.748   libk5crypto3 libkeyutils1 libkrb5-3 libkrb5support0 libldap2 libnghttp2-14
#8 3.749   libnghttp3-9 libp11-kit0 libpsl5t64 librtmp1 libsasl2-2 libsasl2-modules-db
#8 3.750   libssh2-1t64 libtasn1-6 libunistring5
#8 3.753 Suggested packages:
#8 3.753   gnutls-bin krb5-doc krb5-user
#8 3.753 Recommended packages:
#8 3.753   bash-completion krb5-locales libldap-common publicsuffix libsasl2-modules
#8 3.908 The following NEW packages will be installed:
#8 3.909   curl libbrotli1 libcom-err2 libcurl4t64 libgnutls30t64 libgssapi-krb5-2
#8 3.909   libidn2-0 libk5crypto3 libkeyutils1 libkrb5-3 libkrb5support0 libldap2
#8 3.910   libnghttp2-14 libnghttp3-9 libp11-kit0 libpsl5t64 librtmp1 libsasl2-2
#8 3.911   libsasl2-modules-db libssh2-1t64 libtasn1-6 libunistring5
#8 3.953 0 upgraded, 22 newly installed, 0 to remove and 0 not upgraded.
#8 3.953 Need to get 4881 kB of archives.
#8 3.953 After this operation, 14.7 MB of additional disk space will be used.
#8 3.953 Get:1 http://deb.debian.org/debian trixie/main amd64 libbrotli1 amd64 1.1.0-2+b7 [307 kB]
#8 3.970 Get:2 http://deb.debian.org/debian trixie/main amd64 libkrb5support0 amd64 1.21.3-5 [33.0 kB]
#8 3.975 Get:3 http://deb.debian.org/debian trixie/main amd64 libcom-err2 amd64 1.47.2-3+b3 [25.0 kB]
#8 3.975 Get:4 http://deb.debian.org/debian trixie/main amd64 libk5crypto3 amd64 1.21.3-5 [81.5 kB]
#8 3.978 Get:5 http://deb.debian.org/debian trixie/main amd64 libkeyutils1 amd64 1.6.3-6 [9456 B]
#8 3.978 Get:6 http://deb.debian.org/debian trixie/main amd64 libkrb5-3 amd64 1.21.3-5 [326 kB]
#8 4.027 Get:7 http://deb.debian.org/debian trixie/main amd64 libgssapi-krb5-2 amd64 1.21.3-5 [138 kB]
#8 4.031 Get:8 http://deb.debian.org/debian trixie/main amd64 libunistring5 amd64 1.3-2 [477 kB]
#8 4.053 Get:9 http://deb.debian.org/debian trixie/main amd64 libidn2-0 amd64 2.3.8-2 [109 kB]
#8 4.068 Get:10 http://deb.debian.org/debian trixie/main amd64 libsasl2-modules-db amd64 2.1.28+dfsg1-9 [19.8 kB]
#8 4.068 Get:11 http://deb.debian.org/debian trixie/main amd64 libsasl2-2 amd64 2.1.28+dfsg1-9 [57.5 kB]
#8 4.087 Get:12 http://deb.debian.org/debian trixie/main amd64 libldap2 amd64 2.6.10+dfsg-1 [194 kB]
#8 4.092 Get:13 http://deb.debian.org/debian trixie/main amd64 libnghttp2-14 amd64 1.64.0-1.1 [76.0 kB]
#8 4.094 Get:14 http://deb.debian.org/debian trixie/main amd64 libnghttp3-9 amd64 1.8.0-1 [67.7 kB]
#8 4.107 Get:15 http://deb.debian.org/debian trixie/main amd64 libpsl5t64 amd64 0.21.2-1.1+b1 [57.2 kB]
#8 4.108 Get:16 http://deb.debian.org/debian trixie/main amd64 libp11-kit0 amd64 0.25.5-3 [425 kB]
#8 4.147 Get:17 http://deb.debian.org/debian trixie/main amd64 libtasn1-6 amd64 4.20.0-2 [49.9 kB]
#8 4.148 Get:18 http://deb.debian.org/debian trixie/main amd64 libgnutls30t64 amd64 3.8.9-3 [1465 kB]
#8 4.270 Get:19 http://deb.debian.org/debian trixie/main amd64 librtmp1 amd64 2.4+20151223.gitfa8646d.1-2+b5 [58.8 kB]
#8 4.271 Get:20 http://deb.debian.org/debian trixie/main amd64 libssh2-1t64 amd64 1.11.1-1 [245 kB]
#8 4.292 Get:21 http://deb.debian.org/debian trixie/main amd64 libcurl4t64 amd64 8.14.1-2 [391 kB]
#8 4.329 Get:22 http://deb.debian.org/debian trixie/main amd64 curl amd64 8.14.1-2 [269 kB]
#8 4.499 debconf: unable to initialize frontend: Dialog
#8 4.499 debconf: (TERM is not set, so the dialog frontend is not usable.)
#8 4.499 debconf: falling back to frontend: Readline
#8 4.499 debconf: unable to initialize frontend: Readline
#8 4.499 debconf: (Can't locate Term/ReadLine.pm in @INC (you may need to install the Term::ReadLine module) (@INC entries checked: /etc/perl /usr/local/lib/x86_64-linux-gnu/perl/5.40.1 /usr/local/share/perl/5.40.1 /usr/lib/x86_64-linux-gnu/perl5/5.40 /usr/share/perl5 /usr/lib/x86_64-linux-gnu/perl-base /usr/lib/x86_64-linux-gnu/perl/5.40 /usr/share/perl/5.40 /usr/local/lib/site_perl) at /usr/share/perl5/Debconf/FrontEnd/Readline.pm line 8, <STDIN> line 22.)
#8 4.499 debconf: falling back to frontend: Teletype
#8 4.505 debconf: unable to initialize frontend: Teletype
#8 4.505 debconf: (This frontend requires a controlling tty.)
#8 4.505 debconf: falling back to frontend: Noninteractive
#8 5.145 Fetched 4881 kB in 0s (11.8 MB/s)
#8 5.180 Selecting previously unselected package libbrotli1:amd64.
(Reading database ... 5643 files and directories currently installed.)
#8 5.185 Preparing to unpack .../00-libbrotli1_1.1.0-2+b7_amd64.deb ...
#8 5.192 Unpacking libbrotli1:amd64 (1.1.0-2+b7) ...
#8 5.237 Selecting previously unselected package libkrb5support0:amd64.
#8 5.238 Preparing to unpack .../01-libkrb5support0_1.21.3-5_amd64.deb ...
#8 5.241 Unpacking libkrb5support0:amd64 (1.21.3-5) ...
#8 5.273 Selecting previously unselected package libcom-err2:amd64.
#8 5.275 Preparing to unpack .../02-libcom-err2_1.47.2-3+b3_amd64.deb ...
#8 5.279 Unpacking libcom-err2:amd64 (1.47.2-3+b3) ...
#8 5.311 Selecting previously unselected package libk5crypto3:amd64.
#8 5.312 Preparing to unpack .../03-libk5crypto3_1.21.3-5_amd64.deb ...
#8 5.315 Unpacking libk5crypto3:amd64 (1.21.3-5) ...
#8 5.347 Selecting previously unselected package libkeyutils1:amd64.
#8 5.349 Preparing to unpack .../04-libkeyutils1_1.6.3-6_amd64.deb ...
#8 5.352 Unpacking libkeyutils1:amd64 (1.6.3-6) ...
#8 5.382 Selecting previously unselected package libkrb5-3:amd64.
#8 5.383 Preparing to unpack .../05-libkrb5-3_1.21.3-5_amd64.deb ...
#8 5.386 Unpacking libkrb5-3:amd64 (1.21.3-5) ...
#8 5.445 Selecting previously unselected package libgssapi-krb5-2:amd64.
#8 5.446 Preparing to unpack .../06-libgssapi-krb5-2_1.21.3-5_amd64.deb ...
#8 5.449 Unpacking libgssapi-krb5-2:amd64 (1.21.3-5) ...
#8 5.497 Selecting previously unselected package libunistring5:amd64.
#8 5.498 Preparing to unpack .../07-libunistring5_1.3-2_amd64.deb ...
#8 5.501 Unpacking libunistring5:amd64 (1.3-2) ...
#8 5.558 Selecting previously unselected package libidn2-0:amd64.
#8 5.559 Preparing to unpack .../08-libidn2-0_2.3.8-2_amd64.deb ...
#8 5.562 Unpacking libidn2-0:amd64 (2.3.8-2) ...
#8 5.595 Selecting previously unselected package libsasl2-modules-db:amd64.
#8 5.596 Preparing to unpack .../09-libsasl2-modules-db_2.1.28+dfsg1-9_amd64.deb ...
#8 5.599 Unpacking libsasl2-modules-db:amd64 (2.1.28+dfsg1-9) ...
#8 5.628 Selecting previously unselected package libsasl2-2:amd64.
#8 5.629 Preparing to unpack .../10-libsasl2-2_2.1.28+dfsg1-9_amd64.deb ...
#8 5.632 Unpacking libsasl2-2:amd64 (2.1.28+dfsg1-9) ...
#8 5.666 Selecting previously unselected package libldap2:amd64.
#8 5.667 Preparing to unpack .../11-libldap2_2.6.10+dfsg-1_amd64.deb ...
#8 5.670 Unpacking libldap2:amd64 (2.6.10+dfsg-1) ...
#8 5.711 Selecting previously unselected package libnghttp2-14:amd64.
#8 5.712 Preparing to unpack .../12-libnghttp2-14_1.64.0-1.1_amd64.deb ...
#8 5.716 Unpacking libnghttp2-14:amd64 (1.64.0-1.1) ...
#8 5.748 Selecting previously unselected package libnghttp3-9:amd64.
#8 5.749 Preparing to unpack .../13-libnghttp3-9_1.8.0-1_amd64.deb ...
#8 5.753 Unpacking libnghttp3-9:amd64 (1.8.0-1) ...
#8 5.790 Selecting previously unselected package libpsl5t64:amd64.
#8 5.791 Preparing to unpack .../14-libpsl5t64_0.21.2-1.1+b1_amd64.deb ...
#8 5.794 Unpacking libpsl5t64:amd64 (0.21.2-1.1+b1) ...
#8 5.827 Selecting previously unselected package libp11-kit0:amd64.
#8 5.828 Preparing to unpack .../15-libp11-kit0_0.25.5-3_amd64.deb ...
#8 5.831 Unpacking libp11-kit0:amd64 (0.25.5-3) ...
#8 5.889 Selecting previously unselected package libtasn1-6:amd64.
#8 5.890 Preparing to unpack .../16-libtasn1-6_4.20.0-2_amd64.deb ...
#8 5.894 Unpacking libtasn1-6:amd64 (4.20.0-2) ...
#8 5.927 Selecting previously unselected package libgnutls30t64:amd64.
#8 5.928 Preparing to unpack .../17-libgnutls30t64_3.8.9-3_amd64.deb ...
#8 5.931 Unpacking libgnutls30t64:amd64 (3.8.9-3) ...
#8 6.007 Selecting previously unselected package librtmp1:amd64.
#8 6.008 Preparing to unpack .../18-librtmp1_2.4+20151223.gitfa8646d.1-2+b5_amd64.deb ...
#8 6.012 Unpacking librtmp1:amd64 (2.4+20151223.gitfa8646d.1-2+b5) ...
#8 6.045 Selecting previously unselected package libssh2-1t64:amd64.
#8 6.046 Preparing to unpack .../19-libssh2-1t64_1.11.1-1_amd64.deb ...
#8 6.049 Unpacking libssh2-1t64:amd64 (1.11.1-1) ...
#8 6.087 Selecting previously unselected package libcurl4t64:amd64.
#8 6.088 Preparing to unpack .../20-libcurl4t64_8.14.1-2_amd64.deb ...
#8 6.091 Unpacking libcurl4t64:amd64 (8.14.1-2) ...
#8 6.134 Selecting previously unselected package curl.
#8 6.135 Preparing to unpack .../21-curl_8.14.1-2_amd64.deb ...
#8 6.139 Unpacking curl (8.14.1-2) ...
#8 6.192 Setting up libkeyutils1:amd64 (1.6.3-6) ...
#8 6.201 Setting up libbrotli1:amd64 (1.1.0-2+b7) ...
#8 6.211 Setting up libnghttp2-14:amd64 (1.64.0-1.1) ...
#8 6.220 Setting up libcom-err2:amd64 (1.47.2-3+b3) ...
#8 6.230 Setting up libkrb5support0:amd64 (1.21.3-5) ...
#8 6.240 Setting up libsasl2-modules-db:amd64 (2.1.28+dfsg1-9) ...
#8 6.250 Setting up libp11-kit0:amd64 (0.25.5-3) ...
#8 6.259 Setting up libunistring5:amd64 (1.3-2) ...
#8 6.267 Setting up libk5crypto3:amd64 (1.21.3-5) ...
#8 6.276 Setting up libsasl2-2:amd64 (2.1.28+dfsg1-9) ...
#8 6.286 Setting up libnghttp3-9:amd64 (1.8.0-1) ...
#8 6.295 Setting up libtasn1-6:amd64 (4.20.0-2) ...
#8 6.305 Setting up libkrb5-3:amd64 (1.21.3-5) ...
#8 6.314 Setting up libssh2-1t64:amd64 (1.11.1-1) ...
#8 6.324 Setting up libldap2:amd64 (2.6.10+dfsg-1) ...
#8 6.333 Setting up libidn2-0:amd64 (2.3.8-2) ...
#8 6.343 Setting up libgssapi-krb5-2:amd64 (1.21.3-5) ...
#8 6.353 Setting up libgnutls30t64:amd64 (3.8.9-3) ...
#8 6.362 Setting up libpsl5t64:amd64 (0.21.2-1.1+b1) ...
#8 6.372 Setting up librtmp1:amd64 (2.4+20151223.gitfa8646d.1-2+b5) ...
#8 6.382 Setting up libcurl4t64:amd64 (8.14.1-2) ...
#8 6.394 Setting up curl (8.14.1-2) ...
#8 6.406 Processing triggers for libc-bin (2.41-12) ...
#8 DONE 6.5s

#9 [4/7] COPY requirements.txt ./
#9 DONE 0.0s

#10 [5/7] RUN pip install --no-cache-dir -r requirements.txt
#10 2.307 Collecting fastapi==0.110.0 (from -r requirements.txt (line 1))
#10 2.330   Downloading fastapi-0.110.0-py3-none-any.whl.metadata (25 kB)
#10 2.383 Collecting uvicorn==0.29.0 (from -r requirements.txt (line 2))
#10 2.389   Downloading uvicorn-0.29.0-py3-none-any.whl.metadata (6.3 kB)
#10 2.597 Collecting pydantic==1.10.15 (from -r requirements.txt (line 3))
#10 2.604   Downloading pydantic-1.10.15-cp311-cp311-manylinux_2_17_x86_64.manylinux2014_x86_64.whl.metadata (150 kB)
#10 2.613      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 150.6/150.6 kB 37.3 MB/s eta 0:00:00
#10 2.737 Collecting starlette<0.37.0,>=0.36.3 (from fastapi==0.110.0->-r requirements.txt (line 1))
#10 2.742   Downloading starlette-0.36.3-py3-none-any.whl.metadata (5.9 kB)
#10 2.773 Collecting typing-extensions>=4.8.0 (from fastapi==0.110.0->-r requirements.txt (line 1))
#10 2.777   Downloading typing_extensions-4.14.1-py3-none-any.whl.metadata (3.0 kB)
#10 2.824 Collecting click>=7.0 (from uvicorn==0.29.0->-r requirements.txt (line 2))
#10 2.830   Downloading click-8.2.1-py3-none-any.whl.metadata (2.5 kB)
#10 2.847 Collecting h11>=0.8 (from uvicorn==0.29.0->-r requirements.txt (line 2))
#10 2.852   Downloading h11-0.16.0-py3-none-any.whl.metadata (8.3 kB)
#10 2.913 Collecting anyio<5,>=3.4.0 (from starlette<0.37.0,>=0.36.3->fastapi==0.110.0->-r requirements.txt (line 1))
#10 2.918   Downloading anyio-4.10.0-py3-none-any.whl.metadata (4.0 kB)
#10 2.949 Collecting idna>=2.8 (from anyio<5,>=3.4.0->starlette<0.37.0,>=0.36.3->fastapi==0.110.0->-r requirements.txt (line 1))
#10 2.958   Downloading idna-3.10-py3-none-any.whl.metadata (10 kB)
#10 2.977 Collecting sniffio>=1.1 (from anyio<5,>=3.4.0->starlette<0.37.0,>=0.36.3->fastapi==0.110.0->-r requirements.txt (line 1))
#10 2.982   Downloading sniffio-1.3.1-py3-none-any.whl.metadata (3.9 kB)
#10 3.005 Downloading fastapi-0.110.0-py3-none-any.whl (92 kB)
#10 3.009    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 92.1/92.1 kB 104.4 MB/s eta 0:00:00
#10 3.013 Downloading uvicorn-0.29.0-py3-none-any.whl (60 kB)
#10 3.016    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 60.8/60.8 kB 271.8 MB/s eta 0:00:00
#10 3.023 Downloading pydantic-1.10.15-cp311-cp311-manylinux_2_17_x86_64.manylinux2014_x86_64.whl (3.1 MB)
#10 3.275    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 3.1/3.1 MB 12.4 MB/s eta 0:00:00
#10 3.279 Downloading click-8.2.1-py3-none-any.whl (102 kB)
#10 3.288    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 102.2/102.2 kB 15.4 MB/s eta 0:00:00
#10 3.292 Downloading h11-0.16.0-py3-none-any.whl (37 kB)
#10 3.298 Downloading starlette-0.36.3-py3-none-any.whl (71 kB)
#10 3.301    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 71.5/71.5 kB 285.8 MB/s eta 0:00:00
#10 3.306 Downloading typing_extensions-4.14.1-py3-none-any.whl (43 kB)
#10 3.309    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 43.9/43.9 kB 250.1 MB/s eta 0:00:00
#10 3.313 Downloading anyio-4.10.0-py3-none-any.whl (107 kB)
#10 3.317    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 107.2/107.2 kB 88.8 MB/s eta 0:00:00
#10 3.321 Downloading idna-3.10-py3-none-any.whl (70 kB)
#10 3.324    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 70.4/70.4 kB 262.2 MB/s eta 0:00:00
#10 3.329 Downloading sniffio-1.3.1-py3-none-any.whl (10 kB)
#10 3.491 Installing collected packages: typing-extensions, sniffio, idna, h11, click, uvicorn, pydantic, anyio, starlette, fastapi
#10 4.246 Successfully installed anyio-4.10.0 click-8.2.1 fastapi-0.110.0 h11-0.16.0 idna-3.10 pydantic-1.10.15 sniffio-1.3.1 starlette-0.36.3 typing-extensions-4.14.1 uvicorn-0.29.0
#10 4.246 WARNING: Running pip as the 'root' user can result in broken permissions and conflicting behaviour with the system package manager. It is recommended to use a virtual environment instead: https://pip.pypa.io/warnings/venv
#10 4.344
#10 4.344 [notice] A new release of pip is available: 24.0 -> 25.2
#10 4.344 [notice] To update, run: pip install --upgrade pip
#10 DONE 4.6s

#11 [6/7] COPY . .
#11 DONE 0.0s

#12 [7/7] RUN curl -fsSL https://github.com/tailwindlabs/tailwindcss/releases/latest/download/tailwindcss-linux-x64 -o /usr/local/bin/tailwindcss  && chmod +x /usr/local/bin/tailwindcss  && tailwindcss -c /srv/app/tailwind.config.js -i /srv/app/app/static/tw.css -o /srv/app/app/static/tailwind.css --minify
#12 11.74 ≈ tailwindcss v4.1.12
#12 11.74
#12 11.80 Done in 65ms
#12 DONE 11.8s

#13 exporting to image
#13 exporting layers
#13 exporting layers 0.5s done
#13 writing image sha256:62b320f6ec977ea984c5dd41b1a561a53688cf30203d71b5d5490627b0fd0b5c done
#13 naming to docker.io/library/taskmasterweb-taskmasterweb done
#13 DONE 0.5s

#14 resolving provenance for metadata file
#14 DONE 0.0s
[+] Building 1/1
 ✔ taskmasterweb-taskmasterweb  Built                                                                              0.0s

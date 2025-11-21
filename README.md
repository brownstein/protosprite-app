## ProtoSprite-App

Launch your own version of the app locally.


## Prerequisites:
- NPM package manager
- Compatible OS. This project has only been tested on Windows. Linux support is experimental and not guaranteed.
- https://www.electronjs.org/docs/latest/development/build-instructions-linux

## How to Run

Clone this repository, navigate to the folder via a command line terminal and type:

```npm install```

and then,

```npm start```


To build, the command is
```npm run make```


## Known Issues

On some Linux distributions, you may have to change instances of `usr/*` in the node_modules. As elaborated [in this electron issue here](https://github.com/electron-userland/electron-installer-redhat/issues/343) For example:

Change

```cp <%= process.platform === 'darwin' ? '-R' : '-r' %> usr/* %{buildroot}/usr/```

to,

```cp <%= process.platform === 'darwin' ? '-R' : '-r' %> ../usr/. %{buildroot}/usr/```

<!--
Before reporting a bug, please check for existing or closed issues
first and read the instructions for filing a bug report:
https://github.com/meteor/meteor/blob/devel/CONTRIBUTING.md#reporting-a-bug-in-meteor

### This bug report should include:
- [ ] A short, but descriptive title. The title doesn't need "Meteor" in it.
- [ ] The version of Meteor showing the problem.
- [ ] The last version of Meteor where the problem did _not_ occur, if applicable.
- [ ] The operating system you're running Meteor on.
- [ ] The expected behavior.
- [ ] The actual behavior.
- [ ] A **simple** reproduction! (Must include the Github repository and steps to reproduce the issue on it.)

If you don't include a reproduction the issue is probably going to be closed.

### Independent packages

Please ensure your issue is opened in the appropriate repository:

* Feature Requests: https://github.com/meteor/meteor/discussions
* Blaze: https://github.com/meteor/blaze/
* Galaxy Guide: https://github.com/meteor/galaxy-docs/
-->

# 3.4.1 Startup error when using the defineMutationMethods property in a collection declaration #14381

When using the packages `aldeed:collection2@4.1.5` and `aldeed:simple-schema@1.13.1` in a project, declaring a collection with the `defineMutationMethods: false` property triggers the following error:

```
packages/core-runtime.js:189                  
            throw error;
            ^

TypeError: Cannot read properties of undefined (reading 'insert')
    at packages/allow-deny/allow-deny.js:590:29
    at Array.forEach (<anonymous>)
    at addValidator (packages/allow-deny/allow-deny.js:570:5)
    at CollectionPrototype.deny (packages/allow-deny/allow-deny.js:72:3)
    at defineDeny (packages/aldeed:collection2/main.js:765:9)
    at Collection.c2AttachSchema [as attachSchema] (packages/aldeed:collection2/main.js:113:5)
    at Object../imports/api/links.js (webpack:/meteor-define-mutation-methods/imports/api/links.js:11:17)
    ...
```

Example: [https://github.com/meteor-bits/meteor-define-mutation-methods](https://github.com/meteor-bits/meteor-define-mutation-methods)

This error didn't occur in the **3.4.1-beta** release.

Environment:
* Meteor version: 3.4.1
* OS: Xubuntu 24.04 (x86_64)
* Local Node v22.22.2

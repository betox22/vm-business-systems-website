# 06 - Installed Tools on This Machine

## PHP

Installed portable under:

```text
C:\Users\alber\Projects\.tools\php-8.5.8
```

Executable:

```text
C:\Users\alber\Projects\.tools\php-8.5.8\php.exe
```

Enabled extensions:

- curl
- fileinfo
- mbstring
- mysqli
- openssl
- pdo_mysql
- zip

## Composer

Installed portable under:

```text
C:\Users\alber\Projects\.tools\composer
```

Executable wrapper:

```text
C:\Users\alber\Projects\.tools\composer\composer.cmd
```

Composer PHAR:

```text
C:\Users\alber\Projects\.tools\composer\composer.phar
```

## PATH Notes

The PHP and Composer directories were added to the Windows user PATH.

Existing terminal sessions may not see the updated PATH until reopened. The
absolute paths above always work.

## npm Prefix

The Windows user npm prefix was set to:

```text
C:\Users\alber\Projects\.tools\npm
```

This avoids a broken or inaccessible `AppData\Roaming\npm` global prefix.

If npm fails with a missing `npm-cli.js` under AppData, set:

```powershell
[Environment]::SetEnvironmentVariable('NPM_CONFIG_PREFIX','C:\Users\alber\Projects\.tools\npm','User')
```

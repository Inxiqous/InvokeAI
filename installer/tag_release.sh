#!/bin/bash

set -e

BCYAN="\033[1;36m"
BYELLOW="\033[1;33m"
BGREEN="\033[1;32m"
BRED="\033[1;31m"
RED="\033[31m"
RESET="\033[0m"

function is_bin_in_path {
    builtin type -P "$1" &>/dev/null
}

function does_tag_exist {
    git rev-parse --quiet --verify "refs/tags/$1" >/dev/null
}

function git_show_ref {
    git show-ref --dereference $1 --abbrev 7
}

function git_show {
    git show -s --format='%h %s' $1
}

# Some machines only have `python3` in PATH, others have `python` - make an alias.
# We can use a function to approximate an alias within a non-interactive shell.
if ! is_bin_in_path python && is_bin_in_path python3; then
    function python {
        python3 "$@"
    }
fi

VERSION=$(
    cd ..
    python -c "from invokeai.version import __version__ as version; print(version)"
)
PATCH=""
MAJOR_VERSION=$(echo $VERSION | sed 's/\..*$//')
VERSION="v${VERSION}${PATCH}"
LATEST_TAG="v${MAJOR_VERSION}-latest"

if does_tag_exist $VERSION; then
    echo -e "${BCYAN}${VERSION}${RESET} already exists:"
    git_show_ref tags/$VERSION
    echo
fi
if does_tag_exist $LATEST_TAG; then
    echo -e "${BCYAN}${LATEST_TAG}${RESET} already exists:"
    git_show_ref tags/$LATEST_TAG
    echo
fi

echo -e "${BGREEN}HEAD${RESET}:"
git_show
echo

echo -e "${BGREEN}git remote -v${RESET}:"
git remote -v
echo

echo -e -n "Create tags ${BCYAN}${VERSION}${RESET} and ${BCYAN}${LATEST_TAG}${RESET} @ ${BGREEN}HEAD${RESET}, ${RED}deleting existing tags on origin remote${RESET}? "
read -e -p 'y/n [n]: ' input
RESPONSE=${input:='n'}
if [ "$RESPONSE" == 'y' ]; then
    echo
    echo -e "Deleting ${BCYAN}${VERSION}${RESET} tag on origin remote..."
    git push --delete origin $VERSION

    echo -e "Tagging ${BGREEN}HEAD${RESET} with ${BCYAN}${VERSION}${RESET} on locally..."
    if ! git tag -fa $VERSION; then
        echo "Existing/invalid tag"
        exit -1
    fi

    echo -e "Deleting ${BCYAN}${LATEST_TAG}${RESET} tag on origin remote..."
    git push --delete origin $LATEST_TAG

    echo -e "Tagging ${BGREEN}HEAD${RESET} with ${BCYAN}${LATEST_TAG}${RESET} locally..."
    git tag -fa $LATEST_TAG

    echo -e "Pushing updated tags to origin remote..."
    git push origin --tags
fi
exit 0

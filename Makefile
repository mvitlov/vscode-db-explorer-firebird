.PHONY: c e i

# # git fetch --prune
# # npm install 2>&1
# # npm install -g @vscode/vsce
# # npm run compile 2>&1
# # vsce package

# compile:
# 	npm run compile 2>&1 &&\
# 	vsce package

i:
	npm install 2>&1

c:
	npm run compile 2>&1

e:
	vsce package



# build:
# 	mkdir -p build
# 	cd build && cmake -DCMAKE_PREFIX_PATH="$(brew --prefix)" -DCMAKE_BUILD_TYPE=Release .. && make -j$$(nproc || sysctl -n hw.ncpu || echo 2)
# open:
# 	cd build && open flamerobin.app
# clean:
# 	rm -rf build
# 	brew install cmake wxwidgets
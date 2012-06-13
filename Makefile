# Makefile for node-alexa

test:
	@PATH=./node_modules/.bin:$(PATH) \
	mocha \
	--reporter spec \
	--ui bdd \
	--ignore-leaks

.PHONY: test
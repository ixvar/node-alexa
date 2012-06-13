# Makefile for node-alexa

test:
	@./node_modules/.bin/mocha \
	--reporter spec \
	--ui bdd \
	--ignore-leaks

.PHONY: test
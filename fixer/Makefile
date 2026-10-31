up:
	docker compose up --build
seed:
	python scripts/sync_fixtures.py
reset:
	curl --fail -X POST localhost:8080/api/reset
test:
	python scripts/check_scaffold.py
	cd backend && mvn test
	cd ai && python -m pytest -q
	cd web && npm run build
pack:
	bash scripts/pack_zip.sh

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from schemas import ErrorBody, ErrorResponse, Program, ProgramsFile
from services.programs import get_program, get_programs

router = APIRouter(prefix="/programs", tags=["programs"])


@router.get("", response_model=ProgramsFile)
def list_programs() -> ProgramsFile:
    return get_programs()


@router.get("/{program_id}", response_model=Program, responses={404: {"model": ErrorResponse}})
def read_program(program_id: str):
    program = get_program(program_id)
    if program is None:
        body = ErrorResponse(
            error=ErrorBody(code="program_not_found", message="찾는 지원사업이 없어요.")
        )
        return JSONResponse(status_code=404, content=body.model_dump())
    return program

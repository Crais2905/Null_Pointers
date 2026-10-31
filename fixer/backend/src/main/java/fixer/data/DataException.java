package fixer.data;
/** API layer maps status/code to {code,message}. */
public class DataException extends RuntimeException {
 private final int status;
 private final String code;
 public DataException(int status,String code,String message){super(message);this.status=status;this.code=code;}
 public int status(){return status;}
 public String code(){return code;}
 public static DataException missing(String resource){return new DataException(404,"NOT_FOUND",resource+" not found");}
 public static DataException conflict(String message){return new DataException(409,"STATE_CONFLICT",message);}
 public static DataException invalid(String message){return new DataException(400,"INVALID_INPUT",message);}
}
